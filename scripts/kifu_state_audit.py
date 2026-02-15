#!/usr/bin/env python3
"""Collect a compact cross-page data snapshot from authenticated Kifu APIs.

Usage:
  KIFU_AUDIT_EMAIL=... KIFU_AUDIT_PASSWORD=... python3 scripts/kifu_state_audit.py
  python3 scripts/kifu_state_audit.py --api http://127.0.0.1:8080 --email user@kifu.local --password pass
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple


def request(
    base_url: str,
    method: str,
    path: str,
    token: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Tuple[int, Any, str]:
    url = f"{base_url.rstrip('/')}{path}"
    data = None
    headers = {
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        data = body
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.getcode()
            raw = response.read()
            body_text = raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        status = exc.code
        body_text = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
    except Exception as exc:
        return 0, {"error": str(exc)}, ""

    try:
        body: Any = json.loads(body_text) if body_text else {}
    except Exception:
        body = body_text

    return status, body, body_text


def ensure_auth(base_url: str, email: str, password: str) -> str:
    login_body = {"email": email, "password": password}
    status, body, _ = request(f"{base_url}", "POST", "/api/v1/auth/login", payload=login_body)
    if status != 200:
        raise RuntimeError(f"/api/v1/auth/login failed (HTTP {status}): {body}")

    token = body.get("access_token") if isinstance(body, dict) else None
    if not token:
        raise RuntimeError("Login response did not include access_token")
    return token


def probe(base_url: str, token: str) -> Dict[str, Any]:
    endpoints = {
        "health": ("GET", "/health", None),
        "me": ("GET", "/api/v1/users/me", None),
        "subscription": ("GET", "/api/v1/users/me/subscription", None),
        "trade_summary": ("GET", "/api/v1/trades/summary", None),
        "trades_latest": ("GET", "/api/v1/trades?page=1&limit=20", token),
        "bubbles_latest": ("GET", "/api/v1/bubbles?page=1&limit=20&sort=desc", token),
        "review_stats": ("GET", "/api/v1/review/stats?period=30d", token),
        "review_accuracy": ("GET", "/api/v1/review/accuracy?period=30d&outcome_period=1h", token),
        "review_calendar": (
            "GET",
            f"/api/v1/review/calendar?from={datetime.now().strftime('%Y-%m-%d')}&to={datetime.now().strftime('%Y-%m-%d')}",
            token,
        ),
        "portfolio_timeline": ("GET", "/api/v1/portfolio/timeline?limit=50", token),
        "portfolio_positions": ("GET", "/api/v1/portfolio/positions?status=all&limit=200", token),
        "manual_positions": ("GET", "/api/v1/manual-positions?status=all", token),
        "notes": ("GET", "/api/v1/notes?page=1&limit=20", token),
        "safety_today": ("GET", "/api/v1/safety/today", token),
        "guided_review_today": ("GET", "/api/v1/guided-reviews/today?timezone=Asia/Seoul", token),
        "alerts": ("GET", "/api/v1/alerts?limit=10", token),
        "klines_btc_1d": (
            "GET",
            "/api/v1/market/klines?symbol=BTCUSDT&interval=1d&limit=5",
            token,
        ),
    }

    result: Dict[str, Any] = {}
    for name, (method, path, path_token) in endpoints.items():
        use_token = token if path_token else None
        status, body, raw = request(base_url, method, path, token=use_token)
        result[name] = {
            "status": status,
            "body": body if status != 0 else {"error": raw},
        }
    return result


def print_summary(api_url: str, email: str, results: Dict[str, Any], generated_at: str) -> None:
    def _safe_int(value: Any) -> Optional[int]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str) and value.strip().lstrip("-").replace(".", "", 1).isdigit():
            return int(float(value))
        return None

    def _safe_str(value: Any) -> Optional[str]:
        if isinstance(value, str):
            return value
        return None

    def _extract_total(payload: Dict[str, Any], key: str = "total") -> Optional[int]:
        body = payload.get("body", {})
        if isinstance(body, dict):
            return _safe_int(body.get(key))
        return None

    def _extract_items(payload: Dict[str, Any]) -> int:
        body = payload.get("body")
        if isinstance(body, dict):
            items = body.get("items")
            if isinstance(items, list):
                return len(items)
        return 0

    print(f"=== KIFU_AUDIT_SUMMARY ===")
    print(f"generated_at: {generated_at}")
    print(f"api: {api_url}")
    print(f"user: {email}")
    print(f"health: {results.get('health', {}).get('status')}")

    me = results.get("me", {})
    if isinstance(me.get("body"), dict):
        print(f"user_id: {me['body'].get('id','-')}")
        print(f"ai_allowlisted: {me['body'].get('ai_allowlisted','-')}")

    subs = results.get("subscription", {})
    if isinstance(subs.get("body"), dict):
        quota_rem = subs["body"].get("ai_quota_remaining")
        quota_lim = subs["body"].get("ai_quota_limit")
        print(f"ai_quota: {quota_rem}/{quota_lim}")

    trade_summary = results.get("trade_summary", {})
    print(f"trade_summary.total_trades: {_extract_total(trade_summary)}")
    print(f"trades.latest_count: {_extract_items(results.get('trades_latest', {}))}")
    if isinstance(results.get("trades_latest", {}).get("body"), dict):
        print(f"trades.latest_first_id: {results['trades_latest']['body'].get('items',[{}])[0].get('id','-') if results['trades_latest']['body'].get('items') else '-'}")

    bubble_res = results.get("bubbles_latest", {})
    print(f"bubbles.total: {_extract_total(bubble_res)}")
    print(f"bubbles.latest_count: {_extract_items(bubble_res)}")

    review_stats = results.get("review_stats", {}).get("body")
    if isinstance(review_stats, dict):
        print(f"review.total_bubbles: {_safe_int(review_stats.get('total_bubbles'))}")
        overall = review_stats.get("overall", {})
        if isinstance(overall, dict):
            print(f"review.win_rate: {_safe_str(overall.get('win_rate'))}")
            print(f"review.total_pnl: {_safe_str(overall.get('total_pnl'))}")

    portfolio_pos = results.get("portfolio_positions", {}).get("body")
    if isinstance(portfolio_pos, dict):
        print(f"portfolio.positions_count: { _safe_int(portfolio_pos.get('count')) or len(portfolio_pos.get('positions', [])) or 0 }")

    print(f"timeline.count: {_extract_items(results.get('portfolio_timeline', {}))}")
    print(f"alerts.status: {results.get('alerts', {}).get('status')}")
    print(f"guided_review.status: {results.get('guided_review_today', {}).get('status')}")
    print(f"=== KIFU_AUDIT_SUMMARY_END ===")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=os.getenv("KIFU_API_URL", "http://127.0.0.1:8080"))
    parser.add_argument("--email", default=os.getenv("KIFU_AUDIT_EMAIL", ""))
    parser.add_argument("--password", default=os.getenv("KIFU_AUDIT_PASSWORD", ""))
    parser.add_argument("--summary", action="store_true", help="Print only a compact summary.")
    parser.add_argument("--save", type=str, help="Save full JSON result to file.")
    args = parser.parse_args()

    if not args.email or not args.password:
        print("ERROR: email/password required. set KIFU_AUDIT_EMAIL and KIFU_AUDIT_PASSWORD,")
        print("or pass --email / --password.")
        return 1

    def write_error_snapshot(error_message: str) -> None:
        if not args.save:
            return
        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "api": args.api,
            "error": error_message,
        }
        with open(args.save, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, ensure_ascii=False, indent=2)

    try:
        token = ensure_auth(args.api, args.email, args.password)
        results = probe(args.api, token)
    except Exception as exc:
        error_msg = str(exc)
        write_error_snapshot(error_msg)
        # keep output format for easy paste/share
        print("=== KIFU_AUDIT_START ===")
        print(
            json.dumps(
                {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "api": args.api,
                    "error": error_msg,
                },
                ensure_ascii=False,
            )
        )
        print("=== KIFU_AUDIT_END ===")
        return 1

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "api": args.api,
        "results": results,
    }
    generated = payload["generated_at"]

    if args.save:
        with open(args.save, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, ensure_ascii=False, indent=2)

    if args.summary:
        print_summary(args.api, args.email, results, generated)
        return 0

    print("=== KIFU_AUDIT_START ===")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print("=== KIFU_AUDIT_END ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
