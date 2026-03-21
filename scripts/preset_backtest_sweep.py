"""
Parameter sweep for preset strategies.
Finds configurations with meaningful returns.
"""

import json
from pathlib import Path
from itertools import product

import pandas as pd
import numpy as np

DATA_PATH = Path("C:/Users/nyuk8/PycharmProjects/MoneyVessel_python/data/binance_btcusdt_15m_cache.csv")

BARS_PER_HOUR = 4


def load_data():
    df = pd.read_csv(DATA_PATH, parse_dates=["time"])
    df = df.sort_values("time").reset_index(drop=True)
    df["returns"] = df["close"].pct_change()
    return df


def run_trades(closes, entries_mask, tp_pct, sl_pct, timeout_bars):
    n = len(closes)
    trades = []
    cooldown_until = -1
    entry_indices = np.where(entries_mask)[0]

    for idx in entry_indices:
        if idx <= cooldown_until or idx + 1 >= n:
            continue
        entry_price = closes[idx]
        exit_type = "timeout"
        exit_price = closes[min(idx + timeout_bars, n - 1)]
        bars_held = min(timeout_bars, n - 1 - idx)

        for j in range(idx + 1, min(idx + timeout_bars + 1, n)):
            ret = (closes[j] - entry_price) / entry_price * 100
            if ret >= tp_pct:
                exit_type = "tp"
                exit_price = closes[j]
                bars_held = j - idx
                break
            if ret <= sl_pct:
                exit_type = "sl"
                exit_price = closes[j]
                bars_held = j - idx
                break

        final_return = (exit_price - entry_price) / entry_price * 100
        trades.append({"return_pct": final_return, "bars_held": bars_held, "exit_type": exit_type})
        cooldown_until = idx + bars_held

    return trades


def summarize(trades, fee_pct=0.08):
    if len(trades) < 10:
        return None
    returns = [t["return_pct"] - fee_pct for t in trades]  # round-trip fee
    wins = sum(1 for r in returns if r > 0)
    return {
        "count": len(trades),
        "win_rate": round(wins / len(trades) * 100, 1),
        "avg_return": round(np.mean(returns), 3),
        "total_return": round(np.sum(returns), 1),
        "avg_bars": round(np.mean([t["bars_held"] for t in trades]), 1),
        "tp": sum(1 for t in trades if t["exit_type"] == "tp"),
        "sl": sum(1 for t in trades if t["exit_type"] == "sl"),
    }


def sweep_dip_rebound(df):
    closes = df["close"].values
    print("\n=== DIP REBOUND SWEEP ===")
    print(f"{'drop%':>6} {'tp%':>5} {'sl%':>5} {'timeout':>8} {'cnt':>5} {'wr%':>6} {'avg%':>7} {'total%':>8}")

    results = []
    for drop_thresh in [5, 7, 8, 10, 12, 15]:
        rolling_max = df["close"].rolling(96).max().values
        drop_pct = (closes - rolling_max) / rolling_max * 100
        entries = drop_pct <= -drop_thresh
        entries[:96] = False

        for tp in [2, 3, 4, 5, 7]:
            for sl in [-2, -3, -4, -5, -7]:
                for timeout_h in [24, 48, 72]:
                    timeout_bars = timeout_h * BARS_PER_HOUR
                    trades = run_trades(closes, entries, tp, sl, timeout_bars)
                    s = summarize(trades)
                    if s and s["avg_return"] > 0.3:
                        print(f"{-drop_thresh:>6} {tp:>5} {sl:>5} {timeout_h:>7}h {s['count']:>5} {s['win_rate']:>6} {s['avg_return']:>7} {s['total_return']:>8}")
                        results.append({"type": "dip_rebound", "drop": drop_thresh, "tp": tp, "sl": sl, "timeout_h": timeout_h, **s})

    return sorted(results, key=lambda x: x["avg_return"], reverse=True)[:10]


def sweep_trend_recovery(df):
    closes = df["close"].values
    print("\n=== TREND RECOVERY SWEEP ===")
    print(f"{'ma_h':>5} {'tp%':>5} {'sl%':>5} {'timeout':>8} {'cnt':>5} {'wr%':>6} {'avg%':>7} {'total%':>8}")

    results = []
    for ma_hours in [10, 20, 40, 60, 80]:
        ma_bars = ma_hours * BARS_PER_HOUR
        ma = pd.Series(closes).rolling(ma_bars).mean().values
        prev_below = np.roll(closes, 1) < np.roll(ma, 1)
        curr_above = closes >= ma
        entries = prev_below & curr_above
        entries[:ma_bars + 1] = False

        for tp in [1.5, 2, 3, 4, 5]:
            for sl in [-1.5, -2, -3, -4]:
                for timeout_h in [24, 48, 72]:
                    timeout_bars = timeout_h * BARS_PER_HOUR
                    trades = run_trades(closes, entries, tp, sl, timeout_bars)
                    s = summarize(trades)
                    if s and s["avg_return"] > 0.3:
                        print(f"{ma_hours:>5} {tp:>5} {sl:>5} {timeout_h:>7}h {s['count']:>5} {s['win_rate']:>6} {s['avg_return']:>7} {s['total_return']:>8}")
                        results.append({"type": "trend_recovery", "ma_h": ma_hours, "tp": tp, "sl": sl, "timeout_h": timeout_h, **s})

    return sorted(results, key=lambda x: x["avg_return"], reverse=True)[:10]


def sweep_volatility(df):
    closes = df["close"].values
    returns = df["returns"].values
    print("\n=== VOLATILITY SPIKE SWEEP ===")
    print(f"{'short':>6} {'mult':>5} {'tp%':>5} {'sl%':>5} {'timeout':>8} {'cnt':>5} {'wr%':>6} {'avg%':>7} {'total%':>8}")

    results = []
    for short_h in [6, 12, 24]:
        short_bars = short_h * BARS_PER_HOUR
        for long_mult in [3, 5, 7]:
            long_bars = short_bars * long_mult
            short_vol = pd.Series(returns).rolling(short_bars).std().values
            long_vol = pd.Series(returns).rolling(long_bars).std().values

            for mult in [1.5, 1.8, 2.0, 2.5]:
                with np.errstate(divide='ignore', invalid='ignore'):
                    ratio = short_vol / long_vol
                entries = ratio >= mult
                entries[:long_bars + 1] = False
                entries[np.isnan(ratio)] = False

                for tp in [2, 3, 4, 5]:
                    for sl in [-2, -3, -4, -5]:
                        for timeout_h in [12, 24, 48]:
                            timeout_bars = timeout_h * BARS_PER_HOUR
                            trades = run_trades(closes, entries, tp, sl, timeout_bars)
                            s = summarize(trades)
                            if s and s["avg_return"] > 0.3:
                                print(f"{short_h:>6} {mult:>5} {tp:>5} {sl:>5} {timeout_h:>7}h {s['count']:>5} {s['win_rate']:>6} {s['avg_return']:>7} {s['total_return']:>8}")
                                results.append({"type": "vol_spike", "short_h": short_h, "mult": mult, "tp": tp, "sl": sl, "timeout_h": timeout_h, **s})

    return sorted(results, key=lambda x: x["avg_return"], reverse=True)[:10]


def main():
    print("Loading data...")
    df = load_data()
    print(f"Rows: {len(df)}")

    top_dip = sweep_dip_rebound(df)
    top_trend = sweep_trend_recovery(df)
    top_vol = sweep_volatility(df)

    print("\n\n========== TOP RESULTS ==========")
    for label, results in [("DIP REBOUND", top_dip), ("TREND RECOVERY", top_trend), ("VOLATILITY SPIKE", top_vol)]:
        print(f"\n--- {label} TOP 5 ---")
        for r in results[:5]:
            print(f"  avg={r['avg_return']:+.3f}%  wr={r['win_rate']}%  n={r['count']}  total={r['total_return']:+.1f}%  | {r}")


if __name__ == "__main__":
    main()
