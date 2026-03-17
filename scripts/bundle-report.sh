#!/usr/bin/env bash
#
# bundle-report.sh - Build the web app and report bundle size metrics
#
# Usage:
#   ./scripts/bundle-report.sh            # build + report
#   ./scripts/bundle-report.sh --skip-build  # report only (reuse last build)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
BUILD_DIR="$WEB_DIR/.next"

# ---------------------------------------------------------------------------
# 1. Build (unless --skip-build)
# ---------------------------------------------------------------------------
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Building web app with ANALYZE=true ..."
  cd "$WEB_DIR"
  ANALYZE=true npm run build 2>&1 | tail -30
  echo ""
fi

# ---------------------------------------------------------------------------
# 2. Verify build output exists
# ---------------------------------------------------------------------------
if [[ ! -d "$BUILD_DIR/static" ]]; then
  echo "ERROR: Build output not found at $BUILD_DIR/static"
  echo "Run 'npm run build' in apps/web first."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Collect metrics
# ---------------------------------------------------------------------------
STATIC_DIR="$BUILD_DIR/static"

# Total JS size (uncompressed)
JS_BYTES=$(find "$STATIC_DIR" -name '*.js' -exec stat --printf='%s\n' {} + 2>/dev/null \
           || find "$STATIC_DIR" -name '*.js' -exec stat -f '%z' {} + 2>/dev/null \
           || echo "0")
JS_TOTAL=$(echo "$JS_BYTES" | awk '{s+=$1} END {print s+0}')

# Total CSS size
CSS_BYTES=$(find "$STATIC_DIR" -name '*.css' -exec stat --printf='%s\n' {} + 2>/dev/null \
            || find "$STATIC_DIR" -name '*.css' -exec stat -f '%z' {} + 2>/dev/null \
            || echo "0")
CSS_TOTAL=$(echo "$CSS_BYTES" | awk '{s+=$1} END {print s+0}')

PAGE_TOTAL=$(find "$STATIC_DIR" -name '*.js' -o -name '*.css' | wc -l | tr -d ' ')

fmt_kb() { echo "scale=1; $1 / 1024" | bc 2>/dev/null || awk "BEGIN{printf \"%.1f\", $1/1024}"; }
fmt_mb() { echo "scale=2; $1 / 1048576" | bc 2>/dev/null || awk "BEGIN{printf \"%.2f\", $1/1048576}"; }

# ---------------------------------------------------------------------------
# 4. Largest JS chunks (top 10)
# ---------------------------------------------------------------------------
echo "================================================================"
echo "  BUNDLE SIZE REPORT"
echo "================================================================"
echo ""
echo "  Total JS:    $(fmt_kb "$JS_TOTAL") KB  ($(fmt_mb "$JS_TOTAL") MB)"
echo "  Total CSS:   $(fmt_kb "$CSS_TOTAL") KB"
echo "  File count:  $PAGE_TOTAL files (.js + .css)"
echo ""

# Budget check
JS_BUDGET_KB=1500   # 1.5 MB uncompressed ~ 300KB gzipped
CSS_BUDGET_KB=250   # 250 KB uncompressed ~ 50KB gzipped

JS_KB=$(fmt_kb "$JS_TOTAL")
CSS_KB=$(fmt_kb "$CSS_TOTAL")

check_budget() {
  local label="$1" actual="$2" budget="$3"
  local over
  over=$(awk "BEGIN{print ($actual > $budget) ? 1 : 0}")
  if [[ "$over" == "1" ]]; then
    echo "  OVER BUDGET  $label: ${actual} KB > ${budget} KB limit"
  else
    echo "  Within budget  $label: ${actual} KB <= ${budget} KB limit"
  fi
}

echo "--- Budget Check ---"
check_budget "JS " "$JS_KB" "$JS_BUDGET_KB"
check_budget "CSS" "$CSS_KB" "$CSS_BUDGET_KB"
echo ""

echo "--- Top 10 Largest JS Chunks ---"
find "$STATIC_DIR" -name '*.js' -exec ls -lS {} + 2>/dev/null \
  | head -10 \
  | awk '{
      kb = $5 / 1024;
      # extract just the filename from the path
      n = split($NF, parts, "/");
      printf "  %8.1f KB  %s\n", kb, parts[n]
    }'
echo ""

echo "--- Top 5 Largest CSS Files ---"
find "$STATIC_DIR" -name '*.css' -exec ls -lS {} + 2>/dev/null \
  | head -5 \
  | awk '{
      kb = $5 / 1024;
      n = split($NF, parts, "/");
      printf "  %8.1f KB  %s\n", kb, parts[n]
    }'
echo ""

# ---------------------------------------------------------------------------
# 5. Potential tree-shaking opportunities
# ---------------------------------------------------------------------------
echo "--- Import Analysis (potential optimizations) ---"
echo ""

# Check for barrel imports from heavy packages not in optimizePackageImports
HEAVY_PKGS=("@tremor/react" "@chatscope/chat-ui-kit-react" "framer-motion" "canvas-confetti" "react-confetti" "react-pdf" "jspdf" "html2canvas")

for pkg in "${HEAVY_PKGS[@]}"; do
  count=$(grep -r "from ['\"]${pkg}['\"]" "$WEB_DIR/app" "$WEB_DIR/components" --include='*.tsx' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$count" -gt 0 ]]; then
    echo "  $pkg: $count import(s) - consider adding to optimizePackageImports or lazy-loading"
  fi
done

# Check for 'use client' files importing server-heavy packages
echo ""
echo "--- 'use client' files importing heavy server packages ---"
grep -rl "'use client'" "$WEB_DIR/app" --include='*.tsx' --include='*.ts' 2>/dev/null | while read -r f; do
  for pkg in "stripe" "twilio" "sharp" "openai" "onnxruntime"; do
    if grep -q "from ['\"]${pkg}['\"]" "$f" 2>/dev/null; then
      echo "  WARNING: $f is 'use client' but imports '$pkg'"
    fi
  done
done || true

echo ""
echo "================================================================"
echo "  Run 'npm run build:analyze' for interactive bundle visualization"
echo "================================================================"
