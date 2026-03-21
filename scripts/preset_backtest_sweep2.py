"""
Sweep 2: RSI Oversold + BTC Cycle strategies
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

DATA_PATH = Path("C:/Users/nyuk8/PycharmProjects/MoneyVessel_python/data/binance_btcusdt_15m_cache.csv")


def load_data():
    df = pd.read_csv(DATA_PATH, parse_dates=["time"])
    df = df.sort_values("time").reset_index(drop=True)
    df["returns"] = df["close"].pct_change()
    return df


def compute_rsi(closes, period):
    delta = pd.Series(closes).diff()
    gain = delta.where(delta > 0, 0.0).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0.0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs)).values


def run_trades(closes, entries_mask, tp_pct, sl_pct, timeout_bars):
    n = len(closes)
    trades = []
    cooldown_until = -1
    for idx in np.where(entries_mask)[0]:
        if idx <= cooldown_until or idx + 1 >= n:
            continue
        entry_price = closes[idx]
        exit_type = "timeout"
        exit_price = closes[min(idx + timeout_bars, n - 1)]
        bars_held = min(timeout_bars, n - 1 - idx)
        for j in range(idx + 1, min(idx + timeout_bars + 1, n)):
            ret = (closes[j] - entry_price) / entry_price * 100
            if ret >= tp_pct:
                exit_type = "tp"; exit_price = closes[j]; bars_held = j - idx; break
            if ret <= sl_pct:
                exit_type = "sl"; exit_price = closes[j]; bars_held = j - idx; break
        final_return = (exit_price - entry_price) / entry_price * 100
        trades.append({"return_pct": final_return, "bars_held": bars_held, "exit_type": exit_type})
        cooldown_until = idx + bars_held
    return trades


def summarize(trades, fee=0.08):
    if len(trades) < 10:
        return None
    rets = [t["return_pct"] - fee for t in trades]
    wins = sum(1 for r in rets if r > 0)
    return {
        "n": len(trades),
        "wr": round(wins / len(trades) * 100, 1),
        "avg": round(np.mean(rets), 3),
        "total": round(sum(rets), 1),
        "avg_bars": round(np.mean([t["bars_held"] for t in trades]), 1),
    }


def sweep_rsi_oversold(df):
    closes = df["close"].values
    print("\n=== RSI OVERSOLD SWEEP ===")
    print(f"{'period':>7} {'thresh':>6} {'tp%':>5} {'sl%':>5} {'tmout':>6} {'n':>5} {'wr%':>6} {'avg%':>7} {'tot%':>7} {'bars':>6}")

    results = []
    for rsi_period_h in [6, 12, 24, 48]:
        rsi_bars = rsi_period_h * 4
        rsi = compute_rsi(closes, rsi_bars)

        for thresh in [20, 25, 30]:
            # Enter when RSI drops below threshold
            prev_above = np.roll(rsi, 1) >= thresh
            curr_below = rsi < thresh
            entries = prev_above & curr_below
            entries[:rsi_bars + 1] = False
            entries[np.isnan(rsi)] = False

            for tp in [2, 3, 4, 5, 7]:
                for sl in [-3, -5, -7]:
                    for timeout_h in [24, 48, 72]:
                        timeout_bars = timeout_h * 4
                        trades = run_trades(closes, entries, tp, sl, timeout_bars)
                        s = summarize(trades)
                        if s and s["avg"] > 0.3:
                            print(f"{rsi_period_h:>6}h {thresh:>6} {tp:>5} {sl:>5} {timeout_h:>5}h {s['n']:>5} {s['wr']:>6} {s['avg']:>7} {s['total']:>7} {s['avg_bars']:>6}")
                            results.append({"type": "rsi_oversold", "rsi_h": rsi_period_h, "thresh": thresh, "tp": tp, "sl": sl, "timeout_h": timeout_h, **s})

    # Also try: RSI enters oversold zone (below thresh for N bars then crosses back above)
    print("\n--- RSI RECOVERY (cross back above threshold) ---")
    print(f"{'period':>7} {'thresh':>6} {'tp%':>5} {'sl%':>5} {'tmout':>6} {'n':>5} {'wr%':>6} {'avg%':>7} {'tot%':>7} {'bars':>6}")
    for rsi_period_h in [6, 12, 24]:
        rsi_bars = rsi_period_h * 4
        rsi = compute_rsi(closes, rsi_bars)

        for thresh in [25, 30, 35]:
            # Enter when RSI crosses BACK ABOVE threshold from below
            prev_below = np.roll(rsi, 1) < thresh
            curr_above = rsi >= thresh
            entries = prev_below & curr_above
            entries[:rsi_bars + 1] = False
            entries[np.isnan(rsi)] = False

            for tp in [2, 3, 5, 7]:
                for sl in [-3, -5, -7]:
                    for timeout_h in [24, 48, 72]:
                        timeout_bars = timeout_h * 4
                        trades = run_trades(closes, entries, tp, sl, timeout_bars)
                        s = summarize(trades)
                        if s and s["avg"] > 0.3:
                            print(f"{rsi_period_h:>6}h {thresh:>6} {tp:>5} {sl:>5} {timeout_h:>5}h {s['n']:>5} {s['wr']:>6} {s['avg']:>7} {s['total']:>7} {s['avg_bars']:>6}")
                            results.append({"type": "rsi_recovery", "rsi_h": rsi_period_h, "thresh": thresh, "tp": tp, "sl": sl, "timeout_h": timeout_h, **s})

    return sorted(results, key=lambda x: x["avg"], reverse=True)[:15]


def sweep_btc_cycle(df):
    """
    BTC cycle strategies based on:
    1. Distance from N-day high (buy when far from ATH = "cycle dip")
    2. 200-day MA relationship (above = bull, below = bear)
    3. Halving cycle timing (approx 4-year cycle)
    """
    closes = df["close"].values
    times = df["time"].values

    print("\n\n=== BTC CYCLE SWEEP ===")

    results = []

    # Strategy A: Buy when price is X% below N-day high (cycle accumulation)
    print("\n--- CYCLE DIP: Buy when X% below N-day high ---")
    print(f"{'window':>7} {'dip%':>5} {'tp%':>5} {'sl%':>5} {'tmout':>6} {'n':>5} {'wr%':>6} {'avg%':>7} {'tot%':>7}")
    for window_days in [90, 180, 365]:
        window_bars = window_days * 24 * 4
        rolling_high = pd.Series(closes).rolling(window_bars).max().values

        for dip_pct in [20, 30, 40, 50]:
            threshold = 1 - dip_pct / 100
            entries = closes <= rolling_high * threshold
            entries[:window_bars] = False
            entries[np.isnan(rolling_high)] = False

            for tp in [5, 10, 15, 20, 30]:
                for sl in [-5, -10, -15, -20]:
                    for timeout_d in [30, 60, 90, 180]:
                        timeout_bars = timeout_d * 24 * 4
                        trades = run_trades(closes, entries, tp, sl, timeout_bars)
                        s = summarize(trades)
                        if s and s["avg"] > 1.0:
                            print(f"{window_days:>6}d {-dip_pct:>5} {tp:>5} {sl:>5} {timeout_d:>5}d {s['n']:>5} {s['wr']:>6} {s['avg']:>7} {s['total']:>7}")
                            results.append({"type": "cycle_dip", "window_d": window_days, "dip_pct": dip_pct, "tp": tp, "sl": sl, "timeout_d": timeout_d, **s})

    # Strategy B: 200-day MA cross (long-term trend)
    print("\n--- 200-DAY MA CROSS ---")
    print(f"{'ma_d':>5} {'tp%':>5} {'sl%':>5} {'tmout':>6} {'n':>5} {'wr%':>6} {'avg%':>7} {'tot%':>7}")
    for ma_days in [100, 150, 200]:
        ma_bars = ma_days * 24 * 4
        ma = pd.Series(closes).rolling(ma_bars).mean().values
        prev_below = np.roll(closes, 1) < np.roll(ma, 1)
        curr_above = closes >= ma
        entries = prev_below & curr_above
        entries[:ma_bars + 1] = False

        for tp in [5, 10, 15, 20]:
            for sl in [-5, -10, -15]:
                for timeout_d in [30, 60, 90]:
                    timeout_bars = timeout_d * 24 * 4
                    trades = run_trades(closes, entries, tp, sl, timeout_bars)
                    s = summarize(trades)
                    if s and s["avg"] > 1.0:
                        print(f"{ma_days:>5} {tp:>5} {sl:>5} {timeout_d:>5}d {s['n']:>5} {s['wr']:>6} {s['avg']:>7} {s['total']:>7}")
                        results.append({"type": "200ma_cross", "ma_d": ma_days, "tp": tp, "sl": sl, "timeout_d": timeout_d, **s})

    # Strategy C: Buy when price drops X% in N days AND is below 200d MA (bear market accumulation)
    print("\n--- BEAR MARKET ACCUMULATION (below 200d MA + drop) ---")
    print(f"{'drop%':>6} {'tp%':>5} {'sl%':>5} {'tmout':>6} {'n':>5} {'wr%':>6} {'avg%':>7} {'tot%':>7}")
    ma200_bars = 200 * 24 * 4
    ma200 = pd.Series(closes).rolling(ma200_bars).mean().values
    below_200ma = closes < ma200

    for drop_days in [7, 14, 30]:
        drop_bars = drop_days * 24 * 4
        rolling_max = pd.Series(closes).rolling(drop_bars).max().values

        for drop_pct in [10, 15, 20, 30]:
            drop_ratio = (closes - rolling_max) / rolling_max * 100
            entries = (drop_ratio <= -drop_pct) & below_200ma
            entries[:ma200_bars] = False
            entries[np.isnan(ma200)] = False

            for tp in [5, 10, 15, 20, 30]:
                for sl in [-10, -15, -20]:
                    for timeout_d in [30, 60, 90, 180]:
                        timeout_bars = timeout_d * 24 * 4
                        trades = run_trades(closes, entries, tp, sl, timeout_bars)
                        s = summarize(trades)
                        if s and s["avg"] > 1.0:
                            print(f"{-drop_pct:>6} {tp:>5} {sl:>5} {timeout_d:>5}d {s['n']:>5} {s['wr']:>6} {s['avg']:>7} {s['total']:>7}")
                            results.append({"type": "bear_accum", "drop_pct": drop_pct, "tp": tp, "sl": sl, "timeout_d": timeout_d, **s})

    return sorted(results, key=lambda x: x["avg"], reverse=True)[:15]


def main():
    print("Loading data...")
    df = load_data()
    print(f"Rows: {len(df)}, Range: {df['time'].iloc[0]} ~ {df['time'].iloc[-1]}")

    top_rsi = sweep_rsi_oversold(df)
    top_cycle = sweep_btc_cycle(df)

    print("\n\n" + "=" * 60)
    print("TOP RSI OVERSOLD")
    print("=" * 60)
    for r in top_rsi[:10]:
        print(f"  avg={r['avg']:+.3f}%  wr={r['wr']}%  n={r['n']}  total={r['total']:+.1f}%  | {r['type']} rsi_h={r.get('rsi_h')} thresh={r.get('thresh')} tp={r.get('tp')} sl={r.get('sl')} tmout={r.get('timeout_h')}h")

    print("\n" + "=" * 60)
    print("TOP BTC CYCLE")
    print("=" * 60)
    for r in top_cycle[:10]:
        print(f"  avg={r['avg']:+.3f}%  wr={r['wr']}%  n={r['n']}  total={r['total']:+.1f}%  | {r}")


if __name__ == "__main__":
    main()
