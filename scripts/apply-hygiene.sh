#!/usr/bin/env bash
set -euo pipefail

# Repository Hygiene Script for agustif/ghfs
# Requires: GITHUB_TOKEN environment variable with repo write permissions
# Usage: GITHUB_TOKEN=ghp_xxx ./scripts/apply-hygiene.sh

REPO="agustif/ghfs"
API_BASE="https://api.github.com"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN environment variable is required"
  echo "Usage: GITHUB_TOKEN=ghp_xxx ./scripts/apply-hygiene.sh"
  exit 1
fi

echo "==> Applying hygiene to $REPO"
echo ""

# Function to call GitHub API
gh_api() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"
  
  if [[ -n "$data" ]]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$API_BASE/$endpoint" \
      -d "$data"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "$API_BASE/$endpoint"
  fi
}

# 1. Close issue #6 (duplicate of #16)
echo "1. Closing issue #6 (duplicate of #16)..."
gh_api POST "repos/$REPO/issues/6/comments" \
  '{"body":"Duplicate of #16. Closing in favor of #16 to consolidate discussion."}' | jq -r '.html_url'

gh_api PATCH "repos/$REPO/issues/6" \
  '{"state":"closed","state_reason":"not_planned"}' | jq -r '.html_url'

echo "   ✓ Issue #6 closed"
echo ""

# 2. Close issue #7 (duplicate of #12)
echo "2. Closing issue #7 (duplicate of #12)..."
gh_api POST "repos/$REPO/issues/7/comments" \
  '{"body":"Duplicate of #12. Closing in favor of #12 to consolidate discussion."}' | jq -r '.html_url'

gh_api PATCH "repos/$REPO/issues/7" \
  '{"state":"closed","state_reason":"not_planned"}' | jq -r '.html_url'

echo "   ✓ Issue #7 closed"
echo ""

# 3. Update epic #4 with real issue numbers
echo "3. Updating epic #4 with real child issue numbers..."

EPIC_BODY='# Mission: First-principles agent swarm intelligence foundation

Make ghfs agent-swarm-native, not just "API dump on disk."

## What agent swarms need (offline, skim-cheap):
- **Inventory**: what exists
- **Graph**: what'\''s related
- **Gates**: what blocks action
- **Freshness**: what'\''s stale
- **Context packs**: prompt-sized task bundles
- **Coordination**: locks so agents don'\''t collide

## Foundation tracks:
- [x] #25 Graph system (nodes/edges) - implemented in #19 as graph.jsonl
- [ ] #21 Context packs (small/medium/large)
- [ ] #20 Policy + gate DSL
- [ ] #24 Tiered freshness (hot/warm/cold)
- [ ] #23 Provenance tracking
- [ ] #22 Local coordination (locks/notes)
- [x] #30 Sync-state evolution - implemented in #19 as sync-state.json

## Success:
Architectural PR with contracts + stubs that other sync agents can conform to.

See: https://github.com/agustif/ghfs/pull/19'

gh_api PATCH "repos/$REPO/issues/4" \
  "$(jq -n --arg body "$EPIC_BODY" '{body: $body}')" | jq -r '.html_url'

echo "   ✓ Epic #4 updated"
echo ""

echo "==> Hygiene complete!"
echo ""
echo "Summary:"
echo "  ✓ Closed issue #6 → #16"
echo "  ✓ Closed issue #7 → #12"
echo "  ✓ Updated epic #4 checklist"
