"""
Final preset backtest — generates card data for KIFU v0.1
3 presets: Extreme Dip Rebound / Volatility Spike / Cycle Accumulation
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import numpy as np

DATA_PATH = Path("C:/Users/nyuk8/PycharmProjects/MoneyVessel_python/data/binance_btcusdt_15m_cache.csv")
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "docs" / "runbook" / "preset_backtest_results_final.json"

BARS_PER_HOUR = 4
BARS_PER_DAY = 96


def load_data():
    df = pd.read_csv(DATA_PATH, parse_dates=["time"])
    df = df.sort_values("time").reset_index(drop=True)
    df["returns"] = df["close"].pct_change()
    return df


def run_trades(closes, times, entries_mask, tp_pct, sl_pct, timeout_bars):
    n = len(closes)
    trades = []
    cooldown_until = -1
    for idx in np.where(entries_mask)[0]:
        if idx <= cooldown_until or idx + 1 >= n:
            continue
        entry_price = closes[idx]
        entry_time = times[idx]
        exit_type = "timeout"
        best = 0.0
        worst = 0.0
        exit_bar = min(idx + timeout_bars, n - 1)
        exit_price = closes[exit_bar]
        bars_held = exit_bar - idx

        for j in range(idx + 1, min(idx + timeout_bars + 1, n)):
            ret = (closes[j] - entry_price) / entry_price * 100
            best = max(best, ret)
            worst = min(worst, ret)
            if ret >= tp_pct:
                exit_type = "tp"; exit_price = closes[j]; bars_held = j - idx; break
            if ret <= sl_pct:
                exit_type = "sl"; exit_price = closes[j]; bars_held = j - idx; break

        final_return = (exit_price - entry_price) / entry_price * 100
        trades.append({
            "entry_time": str(entry_time)[:19],
            "entry_price": round(entry_price, 2),
            "exit_type": exit_type,
            "return_pct": round(final_return, 3),
            "return_after_fee": round(final_return - 0.08, 3),
            "bars_held": bars_held,
            "max_favorable": round(best, 3),
            "max_adverse": round(worst, 3),
        })
        cooldown_until = idx + bars_held
    return trades


def compute_summary(trades, window_label):
    if not trades:
        return {"signal_count": 0, "win_rate": 0, "avg_return_pct": 0, "max_drawdown_pct": 0}
    returns = [t["return_after_fee"] for t in trades]
    wins = sum(1 for r in returns if r > 0)
    bars = [t["bars_held"] for t in trades]
    worst = min(t["max_adverse"] for t in trades)
    return {
        "signal_count": len(trades),
        "win_rate": round(wins / len(trades) * 100, 1),
        "avg_return_pct": round(np.mean(returns), 2),
        "total_return_pct": round(sum(returns), 1),
        "max_drawdown_pct": round(worst, 2),
        "avg_hold_bars": round(np.mean(bars), 1),
        "avg_hold_hours": round(np.mean(bars) / BARS_PER_HOUR, 1),
        "window": window_label,
        "tp_count": sum(1 for t in trades if t["exit_type"] == "tp"),
        "sl_count": sum(1 for t in trades if t["exit_type"] == "sl"),
        "timeout_count": sum(1 for t in trades if t["exit_type"] == "timeout"),
    }


def recent_examples(trades, count=5):
    recent = trades[-count:] if len(trades) >= count else trades
    return [{
        "date": t["entry_time"][:10],
        "entry_price": t["entry_price"],
        "result_pct": t["return_after_fee"],
        "exit_type": t["exit_type"],
        "bars_held": t["bars_held"],
    } for t in recent]


def preset_extreme_dip(df):
    """Preset 1: Extreme dip rebound — enter after 15% drop from 24h high"""
    closes = df["close"].values
    times = df["time"].values
    rolling_max = df["close"].rolling(BARS_PER_DAY).max().values
    drop_pct = (closes - rolling_max) / rolling_max * 100
    entries = drop_pct <= -15.0
    entries[:BARS_PER_DAY] = False
    return run_trades(closes, times, entries, tp_pct=5.0, sl_pct=-7.0, timeout_bars=BARS_PER_DAY)


def preset_volatility_spike(df):
    """Preset 2: Volatility spike — enter when 12h vol > 1.8x of 3.5d vol"""
    closes = df["close"].values
    times = df["time"].values
    returns = df["returns"].values
    short_bars = 12 * BARS_PER_HOUR  # 12h
    long_bars = short_bars * 7  # 84h = 3.5d
    short_vol = pd.Series(returns).rolling(short_bars).std().values
    long_vol = pd.Series(returns).rolling(long_bars).std().values
    with np.errstate(divide='ignore', invalid='ignore'):
        ratio = short_vol / long_vol
    entries = ratio >= 1.8
    entries[:long_bars + 1] = False
    entries[np.isnan(ratio)] = False
    return run_trades(closes, times, entries, tp_pct=5.0, sl_pct=-7.0, timeout_bars=48 * BARS_PER_HOUR)


def preset_cycle_accumulation(df):
    """Preset 3: Cycle accumulation — enter when price is 20% below 90d high"""
    closes = df["close"].values
    times = df["time"].values
    window_bars = 90 * BARS_PER_DAY
    rolling_high = df["close"].rolling(window_bars).max().values
    entries = closes <= rolling_high * 0.80  # 20% below
    entries[:window_bars] = False
    entries[np.isnan(rolling_high)] = False
    return run_trades(closes, times, entries, tp_pct=30.0, sl_pct=-20.0, timeout_bars=90 * BARS_PER_DAY)


def main():
    print("Loading BTC 15m data...")
    df = load_data()
    print(f"  Rows: {len(df)}, Range: {df['time'].iloc[0]} ~ {df['time'].iloc[-1]}")

    cutoff_180d = df["time"].iloc[-1] - pd.Timedelta(days=180)
    cutoff_90d = df["time"].iloc[-1] - pd.Timedelta(days=90)
    now = datetime.now(timezone.utc).isoformat()

    presets_config = [
        {
            "id": "extreme-dip-v1",
            "label": "급락 반등 감시",
            "short_description": "24시간 내 15% 이상 급락 후 반등 기회를 감시합니다.",
            "category": "rebound",
            "risk_level": "high",
            "educational_note": "극단적 급락은 강한 반등이 올 수 있지만, 추가 하락이 이어질 위험도 큽니다. 손절 기준(-7%)을 반드시 지키세요.",
            "params": {"trigger": "24h 고점 대비 -15%", "tp": "+5%", "sl": "-7%", "timeout": "24h"},
            "alert_rule_template": {
                "name": "급락 반등 감시",
                "symbol": "BTCUSDT",
                "rule_type": "price_change",
                "config": {"direction": "drop", "threshold_type": "percent", "threshold_value": "15", "reference": "24h"},
                "cooldown_minutes": 1440
            },
            "func": preset_extreme_dip,
        },
        {
            "id": "vol-spike-v1",
            "label": "변동성 급증 감시",
            "short_description": "12시간 변동성이 평소의 1.8배를 넘으면 큰 움직임 시작을 감시합니다.",
            "category": "volatility",
            "risk_level": "medium",
            "educational_note": "변동성 급증은 방향을 알려주지 않습니다. 큰 움직임이 시작됐다는 신호일 뿐이므로 방향 판단은 별도로 해야 합니다.",
            "params": {"trigger": "12h 변동성 > 3.5일 평균의 1.8배", "tp": "+5%", "sl": "-7%", "timeout": "48h"},
            "alert_rule_template": {
                "name": "변동성 급증 감시",
                "symbol": "BTCUSDT",
                "rule_type": "volatility_spike",
                "config": {"timeframe": "12h", "multiplier": "1.8"},
                "cooldown_minutes": 720
            },
            "func": preset_volatility_spike,
        },
        {
            "id": "cycle-accum-v1",
            "label": "사이클 저점 매수",
            "short_description": "90일 고점 대비 20% 이상 하락한 구간에서 중장기 매집 기회를 감시합니다.",
            "category": "cycle",
            "risk_level": "high",
            "educational_note": "사이클 매수는 수주~수개월의 보유를 전제합니다. 단기 추가 하락(-20%)에도 견딜 자금 관리가 필요합니다.",
            "params": {"trigger": "90일 고점 대비 -20%", "tp": "+30%", "sl": "-20%", "timeout": "90일"},
            "alert_rule_template": {
                "name": "사이클 저점 매수",
                "symbol": "BTCUSDT",
                "rule_type": "price_change",
                "config": {"direction": "drop", "threshold_type": "percent", "threshold_value": "20", "reference": "90d"},
                "cooldown_minutes": 10080
            },
            "func": preset_cycle_accumulation,
        },
    ]

    results = {
        "generated_at": now,
        "data_source": "binance_btcusdt_15m_cache.csv",
        "data_range": {"from": str(df["time"].iloc[0])[:19], "to": str(df["time"].iloc[-1])[:19]},
        "fee_applied": "0.08% round-trip",
        "presets": [],
    }

    for preset in presets_config:
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

        s = preset["summary_all"]
        print(f"  All:  signals={s['signal_count']}, wr={s['win_rate']}%, avg={s['avg_return_pct']}%, total={s['total_return_pct']}%")
        s180 = preset["summary_180d"]
        print(f"  180d: signals={s180['signal_count']}, wr={s180['win_rate']}%, avg={s180['avg_return_pct']}%")
        s90 = preset["summary_90d"]
        print(f"  90d:  signals={s90['signal_count']}, wr={s90['win_rate']}%, avg={s90['avg_return_pct']}%")

        results["presets"].append(preset)

    class NumpyEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            return super().default(obj)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)

    print(f"\nResults saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
