#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  GHFS Packages & Releases Observatory                         ║"
echo "║  Comprehensive observability for releases, packages,           ║"
echo "║  containers, attestations, and deployments                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Observation started: $TIMESTAMP"
echo ""

# Array to track which observations succeeded/failed
declare -a RESULTS

run_observation() {
  local name=$1
  local script=$2
  
  echo ""
  echo "┌────────────────────────────────────────────────────────────────┐"
  echo "│  Running: $name"
  echo "└────────────────────────────────────────────────────────────────┘"
  
  if bash "$script"; then
    RESULTS+=("✅ $name: SUCCESS")
  else
    RESULTS+=("❌ $name: FAILED")
  fi
}

# Run all observations
run_observation "Packages" "$SCRIPT_DIR/observe-packages.sh"
run_observation "Releases" "$SCRIPT_DIR/observe-releases.sh"
run_observation "Containers" "$SCRIPT_DIR/observe-containers.sh"
run_observation "Deployments" "$SCRIPT_DIR/observe-deployments.sh"
run_observation "Attestations" "$SCRIPT_DIR/observe-attestations.sh"

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Observation Summary                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

for result in "${RESULTS[@]}"; do
  echo "  $result"
done

echo ""
echo "Observation completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Check if all succeeded
if printf '%s\n' "${RESULTS[@]}" | grep -q "❌"; then
  echo "⚠️  Some observations failed. Check logs above."
  exit 1
else
  echo "✅ All observations completed successfully"
  exit 0
fi
