#!/usr/bin/env bash
# Sprint 7 (6.7): model-cache disk cleanup for SAM2 / SAM3 services.
#
# The SAM services cache downloaded checkpoints + temp video frames under
# SAM{2,3}_CACHE_DIR. Without any reaper those directories grow without
# bound — every new model version adds another ~2.5GB checkpoint, and
# failed video-processing jobs leave `/tmp/<uuid>_<filename>` fragments
# behind. Both fill disk quickly on long-lived containers.
#
# What this script does:
#   1. Deletes any file under the cache root that hasn't been accessed
#      in CACHE_MAX_AGE_DAYS (default 30). Model checkpoints in active
#      use are "accessed" on every inference so they survive.
#   2. Sweeps /tmp for leftover SAM video fragments older than 24h.
#   3. Logs the number of files deleted + bytes reclaimed so the cron
#      dashboard can show trends.
#
# Intended cadence: daily, via the container's host cron or an external
# scheduler pointing at the running pod (`docker exec` / `kubectl exec`).
# Safe to re-run — idempotent and never touches files under
# $CACHE_ROOT_PROTECT (comma-separated paths to never delete).

set -euo pipefail

CACHE_ROOTS=(
  "${SAM2_CACHE_DIR:-/app/model_cache}"
  "${SAM3_CACHE_DIR:-/app/model_cache}"
)
PROTECT="${CACHE_ROOT_PROTECT:-}"
MAX_AGE_DAYS="${CACHE_MAX_AGE_DAYS:-30}"
TMP_MAX_AGE_MINUTES="${TMP_MAX_AGE_MINUTES:-1440}"  # 24h
DRY_RUN="${DRY_RUN:-false}"

log() {
  echo "[sam-cache-cleanup] $(date -u +%FT%TZ) $*"
}

is_protected() {
  local path="$1"
  [[ -z "$PROTECT" ]] && return 1
  IFS=',' read -ra patterns <<< "$PROTECT"
  for p in "${patterns[@]}"; do
    case "$path" in
      "$p"|"$p"/*) return 0 ;;
    esac
  done
  return 1
}

reclaim=0
deleted=0

sweep_cache() {
  local root="$1"
  if [[ ! -d "$root" ]]; then
    log "skipping missing cache dir: $root"
    return
  fi
  log "scanning $root for files older than ${MAX_AGE_DAYS}d"

  # `-atime` = access time; works on both GNU find and BusyBox.
  while IFS= read -r -d '' file; do
    if is_protected "$file"; then
      log "protected, skipping: $file"
      continue
    fi
    size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN would delete ($size bytes): $file"
    else
      rm -f -- "$file"
      reclaim=$((reclaim + size))
      deleted=$((deleted + 1))
    fi
  done < <(find "$root" -type f -atime "+${MAX_AGE_DAYS}" -print0)
}

sweep_tmp() {
  log "scanning /tmp for SAM video fragments older than ${TMP_MAX_AGE_MINUTES}m"
  while IFS= read -r -d '' file; do
    size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    if [[ "$DRY_RUN" == "true" ]]; then
      log "DRY-RUN would delete ($size bytes): $file"
    else
      rm -f -- "$file"
      reclaim=$((reclaim + size))
      deleted=$((deleted + 1))
    fi
  done < <(find /tmp -maxdepth 1 -type f -regextype posix-extended \
    -regex '.*/[0-9a-f-]{36}_.*' -mmin "+${TMP_MAX_AGE_MINUTES}" -print0 2>/dev/null || true)
}

for root in "${CACHE_ROOTS[@]}"; do
  sweep_cache "$root"
done
sweep_tmp

log "done — deleted=${deleted} files, reclaimed=${reclaim} bytes (dry-run=${DRY_RUN})"
