#!/usr/bin/env python3
"""Extract concise fields from kifu_state_audit JSON snapshot."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict


def get_num(payload: Dict[str, Any], keys, default="-"):
    cur: Any = payload
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
    return cur


def get_items(payload: Dict[str, Any], path: list[str], default=None):
    body = get_num(payload, ["body"], {})
    if default is None:
        default = []
    if not isinstance(body, dict):
        return default
    value = body
    for k in path:
        if not isinstance(value, dict):
            return default
        value = value.get(k, default)
    return value if value is not None else default


def extract_summary(data: Dict[str, Any]) -> str:
    gen = data.get("generated_at", "-")
    api = data.get("api", "-")
    results = data.get("results", {})

    def endpoint(path: str):
        return results.get(path, {})

    lines = []
    lines.append("=== KIFU_AUDIT_BRIEF ===")
    lines.append(f"generated_at: {gen}")
    lines.append(f"api: {api}")
    lines.append(f"health_status: {endpoint('health').get('status', '-')}")
    lines.append(f"user_id: {get_num(endpoint('me'), ['body', 'id'], '-')}")
    lines.append(f"ai_allowlisted: {get_num(endpoint('me'), ['body', 'ai_allowlisted'], '-')}")

    subs = endpoint("subscription")
    body_subs = subs.get("body", {}) if isinstance(subs, dict) else {}
    lines.append(
        "ai_quota: "
        f"{body_subs.get('ai_quota_remaining', '-')}/{body_subs.get('ai_quota_limit', '-')}"
    )

    trade_summary = endpoint("trade_summary")
    trade_body = trade_summary.get("body", {}) if isinstance(trade_summary, dict) else {}
    lines.append(f"trade_total: {trade_body.get('totals', {}).get('total_trades', '-') if isinstance(trade_body.get('totals', {}), dict) else trade_body.get('total_trades', '-')}")

    trades_latest = get_items(endpoint("trades_latest"), ["items"], [])
    lines.append(f"trades_latest_count: {len(trades_latest) if isinstance(trades_latest, list) else '-'}")
    if isinstance(trades_latest, list) and trades_latest:
        lines.append(f"trades_latest_first_id: {trades_latest[0].get('id', '-')}")

    bubbles_latest = get_items(endpoint("bubbles_latest"), ["items"], [])
    bubbles_body = endpoint("bubbles_latest").get("body", {}) if isinstance(endpoint("bubbles_latest"), dict) else {}
    lines.append(f"bubbles_total: {bubbles_body.get('total', '-')}")
    lines.append(f"bubbles_latest_count: {len(bubbles_latest) if isinstance(bubbles_latest, list) else '-'}")

    review_stats = endpoint("review_stats").get("body", {}) if isinstance(endpoint("review_stats"), dict) else {}
    if isinstance(review_stats, dict):
        lines.append(f"review.total_bubbles: {review_stats.get('total_bubbles', '-')}")
        overall = review_stats.get("overall", {})
        if isinstance(overall, dict):
            lines.append(f"review.win_rate: {overall.get('win_rate', '-')}")
            lines.append(f"review.total_pnl: {overall.get('total_pnl', '-')}")

    portfolio_positions = endpoint("portfolio_positions").get("body", {}) if isinstance(endpoint("portfolio_positions"), dict) else {}
    lines.append(f"portfolio.positions_count: {portfolio_positions.get('count', 0) if isinstance(portfolio_positions, dict) else '-'}")

    timeline = get_items(endpoint("portfolio_timeline"), ["items"], [])
    lines.append(f"timeline_count: {len(timeline) if isinstance(timeline, list) else '-'}")

    alerts = endpoint("alerts")
    lines.append(f"alerts_status: {alerts.get('status', '-')}")
    guided = endpoint("guided_review_today")
    lines.append(f"guided_review_status: {guided.get('status', '-')}")
    lines.append("=== KIFU_AUDIT_BRIEF_END ===")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", nargs="?", default="/tmp/kifu-audit.json")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: file not found: {path}")
        return 1

    data = json.loads(path.read_text(encoding="utf-8"))
    if "results" not in data:
        print(f"ERROR: invalid audit json: {path}")
        return 1

    print(extract_summary(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

