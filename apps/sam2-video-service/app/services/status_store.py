"""
Sprint 7 (6.3): processing-status persistence layer.

The SAM2 video service tracks per-job status (queued / processing / completed /
failed) in an in-memory dict so clients can poll GET /processing-status/{id}.
Single-worker + no persistence meant:
  - A container restart lost every in-flight job — clients polled forever.
  - Horizontal scaling was impossible: job IDs only existed on the worker
    that accepted them.

This module adds a Redis-backed store with an in-memory fallback. It is
intentionally a thin wrapper around get/set/delete so we can swap the
backend without touching route handlers.

Configuration:
  REDIS_URL (optional) — e.g. redis://localhost:6379/0 or the full Upstash URL.
                        When unset we log a warning and degrade to in-memory.
  SAM2_STATUS_TTL_SECONDS (default 86400 / 1 day) — job statuses expire so
                        abandoned processing records do not accumulate.
"""

import os
import json
import logging
import threading
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_DEFAULT_TTL = 24 * 60 * 60  # 1 day


class InMemoryStatusStore:
    """Legacy behaviour — fine for dev / single-worker. Keys expire after TTL."""

    def __init__(self, ttl_seconds: int = _DEFAULT_TTL):
        self._lock = threading.Lock()
        self._ttl = ttl_seconds
        self._data: Dict[str, Dict[str, Any]] = {}
        self._expiry: Dict[str, float] = {}

    def _evict_expired(self) -> None:
        now = time.time()
        stale = [k for k, t in self._expiry.items() if t <= now]
        for k in stale:
            self._data.pop(k, None)
            self._expiry.pop(k, None)

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            self._evict_expired()
            return self._data.get(job_id)

    def set(self, job_id: str, value: Dict[str, Any]) -> None:
        with self._lock:
            self._data[job_id] = value
            self._expiry[job_id] = time.time() + self._ttl

    def delete(self, job_id: str) -> None:
        with self._lock:
            self._data.pop(job_id, None)
            self._expiry.pop(job_id, None)

    def list_active(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            self._evict_expired()
            return dict(self._data)


class RedisStatusStore:
    """
    Redis-backed store. Each job status lives under key
    `sam2:status:{job_id}` with a TTL so we don't leak abandoned records.
    """

    KEY_PREFIX = "sam2:status:"

    def __init__(self, redis_client: Any, ttl_seconds: int = _DEFAULT_TTL):
        self._redis = redis_client
        self._ttl = ttl_seconds

    def _key(self, job_id: str) -> str:
        return f"{self.KEY_PREFIX}{job_id}"

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        raw = self._redis.get(self._key(job_id))
        if not raw:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Corrupt status payload for %s, dropping", job_id)
            self.delete(job_id)
            return None

    def set(self, job_id: str, value: Dict[str, Any]) -> None:
        # `ex` is Redis TTL in seconds. Both redis-py and Upstash accept this.
        try:
            self._redis.set(self._key(job_id), json.dumps(value), ex=self._ttl)
        except Exception as e:
            logger.error("Failed to write SAM2 status to Redis: %s", e)

    def delete(self, job_id: str) -> None:
        try:
            self._redis.delete(self._key(job_id))
        except Exception as e:
            logger.error("Failed to delete SAM2 status from Redis: %s", e)

    def list_active(self) -> Dict[str, Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}
        try:
            for key in self._redis.scan_iter(match=f"{self.KEY_PREFIX}*"):
                if isinstance(key, bytes):
                    key = key.decode("utf-8")
                job_id = key[len(self.KEY_PREFIX):]
                entry = self.get(job_id)
                if entry is not None:
                    results[job_id] = entry
        except Exception as e:
            logger.error("Failed to enumerate SAM2 statuses in Redis: %s", e)
        return results


def build_status_store() -> Any:
    """
    Factory: returns a Redis-backed store when REDIS_URL is configured and the
    connection works, otherwise the in-memory fallback with a loud warning.
    """
    ttl = int(os.environ.get("SAM2_STATUS_TTL_SECONDS", str(_DEFAULT_TTL)))
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        logger.warning(
            "SAM2_STATUS_STORE: REDIS_URL not set — using in-memory store. "
            "Job status will NOT survive a container restart."
        )
        return InMemoryStatusStore(ttl_seconds=ttl)

    try:
        # Local import so the dependency is optional — the service still
        # starts without redis-py installed if the operator is fine with
        # the in-memory store.
        import redis  # type: ignore

        client = redis.Redis.from_url(redis_url, socket_timeout=2)
        # Ping once to validate connectivity before we trust the store.
        client.ping()
        logger.info("SAM2_STATUS_STORE: using Redis at %s", redis_url)
        return RedisStatusStore(client, ttl_seconds=ttl)
    except Exception as e:
        logger.error(
            "SAM2_STATUS_STORE: Redis unavailable (%s) — falling back to in-memory. "
            "Fix REDIS_URL and restart to enable persistence.",
            e,
        )
        return InMemoryStatusStore(ttl_seconds=ttl)
