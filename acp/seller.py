import logging
import threading
from typing import Optional

import os
import json
import requests
from dotenv import load_dotenv

from virtuals_acp.client import VirtualsACP
from virtuals_acp.contract_clients.contract_client_v2 import ACPContractClientV2
from virtuals_acp.env import EnvSettings
from virtuals_acp.job import ACPJob
from virtuals_acp.memo import ACPMemo
from virtuals_acp.models import ACPJobPhase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("SellerAgent")

load_dotenv(override=True)

REJECT_JOB_IN_REQUEST_PHASE = False
REJECT_JOB_IN_OTHER_PHASE = False

KIFU_API_BASE = os.getenv("KIFU_API_BASE", "").rstrip("/")
KIFU_EMAIL = os.getenv("KIFU_EMAIL", "guest.preview@kifu.local")
KIFU_PASSWORD = os.getenv("KIFU_PASSWORD", "guest1234")

# 토큰 캐시 (만료 1분 전에 자동 갱신)
import time as _time
_kifu_token_cache = {"token": "", "exp": 0}

def get_kifu_token() -> str:
    """KIFU 토큰을 반환. 만료 60초 전이면 자동 갱신."""
    now = _time.time()
    if _kifu_token_cache["token"] and _kifu_token_cache["exp"] - now > 60:
        return _kifu_token_cache["token"]

    logger.info("Refreshing KIFU token...")
    r = requests.post(
        f"{KIFU_API_BASE}/api/v1/auth/login",
        json={"email": KIFU_EMAIL, "password": KIFU_PASSWORD},
        timeout=10,
    )
    r.raise_for_status()
    token = r.json()["access_token"]

    # JWT exp 파싱
    import base64, json as _json
    parts = token.split(".")
    payload = parts[1] + "=" * (4 - len(parts[1]) % 4)
    exp = _json.loads(base64.b64decode(payload)).get("exp", now + 600)

    _kifu_token_cache["token"] = token
    _kifu_token_cache["exp"] = exp
    logger.info(f"KIFU token refreshed, expires in {int(exp - now)}s")
    return token

def call_kifu_quickcheck(requirement):
    if isinstance(requirement, str):
        requirement = json.loads(requirement)

    if not KIFU_API_BASE:
        raise RuntimeError("KIFU_API_BASE not set in .env")

    token = get_kifu_token()
    url = f"{KIFU_API_BASE}/api/v1/jobs/onchain-quick-fact-check"
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(url, json=requirement, headers=headers, timeout=60)
    r.raise_for_status()
    return r.json()

JOB_PAYLOAD_CACHE = {}  # job_id -> payload_str

def seller():
    env = EnvSettings()

    def on_new_task(job: ACPJob, memo_to_sign: Optional[ACPMemo] = None):
        logger.info(f"[on_new_task] Received job {job.id} (phase: {job.phase})")
        logger.info(
            f"memo_to_sign.content type={type(getattr(memo_to_sign, 'content', None))} value={getattr(memo_to_sign, 'content', None)}")
        logger.info(f"job.raw={job.__dict__}")

        if (
                job.phase == ACPJobPhase.REQUEST
                and memo_to_sign is not None
                and memo_to_sign.next_phase == ACPJobPhase.NEGOTIATION
        ):
            payload_str = getattr(memo_to_sign, "content", None)
            logger.info(f"REQUEST memo payload type={type(payload_str)} value(head)={str(payload_str)[:120]}")

            if REJECT_JOB_IN_REQUEST_PHASE:
                job.reject("Job requirement does not meet agent capability")
                return

            job.accept("Accepted")

            if not payload_str:
                payload_str = "{}"

            JOB_PAYLOAD_CACHE[job.id] = payload_str
            job.create_requirement(payload_str)
            job.create_notification("Accepted. Please pay to proceed.")

            logger.info(f"Job {job.id} accepted + requirement set (len={len(payload_str)})")
            return

        elif (
                job.phase == ACPJobPhase.TRANSACTION
                and memo_to_sign is not None
                and memo_to_sign.next_phase == ACPJobPhase.EVALUATION
        ):
            if REJECT_JOB_IN_OTHER_PHASE:
                job.reject("Rejected after payment")
                return

            payload_str = JOB_PAYLOAD_CACHE.get(job.id) or getattr(memo_to_sign, "content", None) or "{}"
            payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str

            result_json = call_kifu_quickcheck(payload)

            logger.info(
                f"Delivering job {job.id} status={result_json.get('status')} err={result_json.get('error_code')}")

            job.deliver(result_json)
            logger.info(f"Job {job.id} delivered")
            return

        elif job.phase == ACPJobPhase.COMPLETED:
            logger.info(f"Job {job.id} completed")

        elif job.phase == ACPJobPhase.REJECTED:
            logger.info(f"Job {job.id} rejected")

    VirtualsACP(
        acp_contract_clients=ACPContractClientV2(
            wallet_private_key=env.WHITELISTED_WALLET_PRIVATE_KEY,
            agent_wallet_address=env.SELLER_AGENT_WALLET_ADDRESS,
            entity_id=env.SELLER_ENTITY_ID
        ),
        on_new_task=on_new_task
    )

    logger.info("Seller agent is running, waiting for new tasks...")
    threading.Event().wait()

if __name__ == "__main__":
    seller()
