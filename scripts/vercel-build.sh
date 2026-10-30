#!/bin/bash
set -euo pipefail
# Keep dashboard overrides on the same checked build entry point.
exec node scripts/vercel-build.js
