"""
Strategy Preset Backtest for KIFU v0.1
Generates summary cards for 3 presets using BTC 15m close data.

Presets:
  1. Dip Rebound  - enter after 24h drop >= 5%, exit TP +2% / SL -3% / timeout 24h
  2. Trend Recovery - enter on close cross above 20MA, exit TP +1.5% / SL -2% / timeout 48h
  3. Volatility Spike - enter when short vol > 2x long vol, exit TP +2.5% / SL -2.5% / timeout 12h
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import numpy as np

DATA_PATH = Path("C:/Users/nyuk8/PycharmProjects/MoneyVessel_python/data/binance_btcusdt_15m_cache.csv")
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "docs" / "runbook" / "preset_backtest_results.json"

BARS_PER_HOUR = 4
BARS_24H = 96
BARS_48H = 192
BARS_12H = 48


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["time"])
    df = df.sort_values("time").reset_index(drop=True)
    df["returns"] = df["close"].pct_change()
    return df


def run_trades(df: pd.DataFrame, entries: pd.Series, tp_pct: float, sl_pct: float, timeout_bars: int):
    """Given boolean entry signals, simulate trades and return results."""
    closes = df["close"].values
    times = df["time"].values
    n = len(closes)

    trades = []
    cooldown_until = -1

    entry_indices = entries[entries].index.tolist()

    for idx in entry_indices:
        if idx <= cooldown_until:
            continue
        if idx + 1 >= n:
            continue

        entry_price = closes[idx]
        entry_time = times[idx]
        best = 0.0
        worst = 0.0
        exit_type = "timeout"
        exit_price = entry_price
        exit_bar = min(idx + timeout_bars, n - 1)
        bars_held = timeout_bars

        for j in range(idx + 1, min(idx + timeout_bars + 1, n)):
            ret = (closes[j] - entry_price) / entry_price * 100
            best = max(best, ret)
            worst = min(worst, ret)

            if ret >= tp_pct:
                exit_type = "tp"
                exit_price = closes[j]
                bars_held = j - idx
                exit_bar = j
                break
            if ret <= sl_pct:
                exit_type = "sl"
                exit_price = closes[j]
                bars_held = j - idx
                exit_bar = j
                break
        else:
            exit_price = closes[min(idx + timeout_bars, n - 1)]
            bars_held = min(timeout_bars, n - 1 - idx)

        final_return = (exit_price - entry_price) / entry_price * 100
        trades.append({
            "entry_time": str(entry_time)[:19],
            "entry_price": round(entry_price, 2),
            "exit_type": exit_type,
            "exit_price": round(exit_price, 2),
            "return_pct": round(final_return, 3),
            "bars_held": bars_held,
            "max_favorable": round(best, 3),
            "max_adverse": round(worst, 3),
        })
        cooldown_until = exit_bar

    return trades


def compute_summary(trades: list, window_label: str):
    if not trades:
        return {"signal_count": 0, "win_rate": 0, "avg_return_pct": 0, "max_drawdown_pct": 0, "avg_hold_bars": 0, "window": window_label}

    wins = sum(1 for t in trades if t["return_pct"] > 0)
    returns = [t["return_pct"] for t in trades]
    bars = [t["bars_held"] for t in trades]
    worst_adverse = min(t["max_adverse"] for t in trades)

    return {
        "signal_count": len(trades),
        "win_rate": round(wins / len(trades) * 100, 1),
        "avg_return_pct": round(np.mean(returns), 3),
        "max_drawdown_pct": round(worst_adverse, 2),
        "avg_hold_bars": round(np.mean(bars), 1),
        "avg_hold_hours": round(np.mean(bars) / BARS_PER_HOUR, 1),
        "window": window_label,
        "tp_count": sum(1 for t in trades if t["exit_type"] == "tp"),
        "sl_count": sum(1 for t in trades if t["exit_type"] == "sl"),
        "timeout_count": sum(1 for t in trades if t["exit_type"] == "timeout"),
    }


def recent_examples(trades: list, count: int = 5):
    recent = trades[-count:] if len(trades) >= count else trades
    return [{"date": t["entry_time"][:10], "entry_price": t["entry_price"], "result_pct": t["return_pct"], "exit_type": t["exit_type"]} for t in recent]


def preset_dip_rebound(df: pd.DataFrame):
    """Preset 1: Enter when price drops >= 5% in past 24h."""
    rolling_max = df["close"].rolling(BARS_24H).max()
    drop_pct = (df["close"] - rolling_max) / rolling_max * 100
    entries = drop_pct <= -5.0
    # Avoid triggering on first 24h of data
    entries.iloc[:BARS_24H] = False

    trades = run_trades(df, entries, tp_pct=2.0, sl_pct=-3.0, timeout_bars=BARS_24H)
    return trades


def preset_trend_recovery(df: pd.DataFrame):
    """Preset 2: Enter when close crosses above 20-bar MA from below."""
    ma20 = df["close"].rolling(80).mean()  # 80 bars = 20h (more meaningful than 20 bars=5h)
    prev_below = df["close"].shift(1) < ma20.shift(1)
    curr_above = df["close"] >= ma20
    entries = prev_below & curr_above
    entries.iloc[:80] = False

    trades = run_trades(df, entries, tp_pct=1.5, sl_pct=-2.0, timeout_bars=BARS_48H)
    return trades


def preset_volatility_spike(df: pd.DataFrame):
    """Preset 3: Enter when short-term volatility > 2x long-term volatility."""
    short_vol = df["returns"].rolling(BARS_24H).std()  # 24h vol
    long_vol = df["returns"].rolling(BARS_24H * 7).std()  # 7-day vol
    ratio = short_vol / long_vol
    entries = ratio >= 2.0
    entries.iloc[:BARS_24H * 7] = False

    trades = run_trades(df, entries, tp_pct=2.5, sl_pct=-2.5, timeout_bars=BARS_12H)
    return trades


def main():
    print("Loading BTC 15m data...")
    df = load_data()
    print(f"  Rows: {len(df)}, Range: {df['time'].iloc[0]} ~ {df['time'].iloc[-1]}")

    # Use last 180 days for summary, full data for context
    cutoff_180d = df["time"].iloc[-1] - pd.Timedelta(days=180)
    cutoff_90d = df["time"].iloc[-1] - pd.Timedelta(days=90)

    now = datetime.now(timezone.utc).isoformat()
    results = {"generated_at": now, "data_range": {"from": str(df["time"].iloc[0])[:19], "to": str(df["time"].iloc[-1])[:19]}, "presets": []}

    presets = [
        {
            "id": "dip-rebound-v1",
            "label": "급락 반등 감시",
            "short_description": "24시간 안에 5% 이상 급락하면 반등 기회를 감시합니다.",
            "category": "rebound",
            "risk_level": "medium",
            "educational_note": "반등형 전략은 하락 추세에서 추가 급락을 잘못 잡을 수 있습니다. 손절 기준을 반드시 확인하세요.",
            "params": {"trigger": "24h drop >= 5%", "tp": "+2%", "sl": "-3%", "timeout": "24h"},
            "func": preset_dip_rebound,
        },
        {
            "id": "trend-recovery-v1",
            "label": "추세 회복 감시",
            "short_description": "가격이 20시간 평균선 아래에서 위로 회복하는 순간을 감시합니다.",
            "category": "trend",
            "risk_level": "low",
            "educational_note": "추세 회복은 '가짜 돌파'가 잦습니다. 돌파 후에도 재이탈할 수 있으므로 확인 매매를 권장합니다.",
            "params": {"trigger": "close crosses above 20h MA", "tp": "+1.5%", "sl": "-2%", "timeout": "48h"},
            "func": preset_trend_recovery,
        },
        {
            "id": "vol-spike-v1",
            "label": "변동성 급증 감시",
            "short_description": "평소보다 변동성이 2배 이상 커지는 순간을 감시합니다.",
            "category": "volatility",
            "risk_level": "high",
            "educational_note": "변동성 급증은 방향을 알려주지 않습니다. 큰 움직임이 시작됐다는 신호일 뿐이므로 방향 판단은 별도로 해야 합니다.",
            "params": {"trigger": "24h vol > 2x 7d vol", "tp": "+2.5%", "sl": "-2.5%", "timeout": "12h"},
            "func": preset_volatility_spike,
        },
    ]

    for preset in presets:
        print(f"\nRunning: {preset['label']}...")
        func = preset.pop("func")
        trades_all = func(df)

        trades_180d = [t for t in trades_all if t["entry_time"] >= str(cutoff_180d)[:19]]
        trades_90d = [t for t in trades_all if t["entry_time"] >= str(cutoff_90d)[:19]]

        preset["summary_all"] = compute_summary(trades_all, f"{str(df['time'].iloc[0])[:10]}~{str(df['time'].iloc[-1])[:10]}")
        preset["summary_180d"] = compute_summary(trades_180d, "180d")
        preset["summary_90d"] = compute_summary(trades_90d, "90d")
        preset["recent_examples"] = recent_examples(trades_all, 5)
        preset["risk_notice"] = "과거 성과는 미래 결과를 보장하지 않습니다."

        s = preset["summary_180d"]
        print(f"  180d: signals={s['signal_count']}, win_rate={s['win_rate']}%, avg_ret={s['avg_return_pct']}%, mdd={s['max_drawdown_pct']}%")
        s_all = preset["summary_all"]
        print(f"  All:  signals={s_all['signal_count']}, win_rate={s_all['win_rate']}%, avg_ret={s_all['avg_return_pct']}%, mdd={s_all['max_drawdown_pct']}%")

        results["presets"].append(preset)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nResults saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
