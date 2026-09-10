#!/bin/bash
set -euo pipefail

REPO="agustif/ghfs"

echo "======================================"
echo "  Deployment Statuses: $REPO"
echo "======================================"

DEPLOYMENT_COUNT=$(gh api "/repos/$REPO/deployments" --jq 'length' 2>/dev/null || echo "0")

echo ""
echo "=== Deployment Summary ==="
echo "Total Deployments: $DEPLOYMENT_COUNT"

if [ "$DEPLOYMENT_COUNT" -eq 0 ]; then
  echo ""
  echo "No deployments found."
  echo ""
  echo "To configure deployments:"
  echo "  1. Add deployment environments in GitHub Settings"
  echo "  2. Create deployment workflows"
  echo "  3. Use 'environment:' in GitHub Actions"
  exit 0
fi

echo ""
echo "=== Recent Deployments (Latest 10) ==="
gh api "/repos/$REPO/deployments" --jq '.[:10] | .[] | {
  id,
  environment,
  ref,
  sha: .sha[0:7],
  task,
  created_at,
  updated_at,
  creator: .creator.login
}' | jq -s '.' || echo "Failed to fetch deployments"

echo ""
echo "=== Deployment Environments ==="
gh api "/repos/$REPO/environments" --jq '.environments[] | {
  name,
  created_at,
  updated_at,
  protection_rules: [.protection_rules[] | .type]
}' 2>/dev/null || echo "No environments configured"

echo ""
echo "=== Deployment Statuses (Latest 5 Deployments) ==="
for deployment_id in $(gh api "/repos/$REPO/deployments" --jq '.[].id' 2>/dev/null | head -5); do
  echo ""
  echo "--- Deployment #$deployment_id ---"
  gh api "/repos/$REPO/deployments/$deployment_id/statuses" --jq '.[] | {
    state,
    description,
    environment,
    created_at,
    target_url
  }' | jq -s '.' 2>/dev/null || echo "No statuses found"
done

echo ""
echo "=== GitHub Pages Deployment ==="
gh api "/repos/$REPO/pages" --jq '{
  status,
  cname,
  html_url,
  build_type,
  source: .source
}' 2>/dev/null || echo "GitHub Pages not configured"

echo ""
echo "======================================"
echo "  Deployment Observation Complete"
echo "======================================"
