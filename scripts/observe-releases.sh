#!/bin/bash
set -euo pipefail

REPO="agustif/ghfs"

echo "======================================"
echo "  GitHub Releases: $REPO"
echo "======================================"

RELEASE_COUNT=$(gh api "/repos/$REPO/releases" --jq 'length' 2>/dev/null || echo "0")

echo ""
echo "=== Release Summary ==="
echo "Total Releases: $RELEASE_COUNT"

if [ "$RELEASE_COUNT" -eq 0 ]; then
  echo ""
  echo "No releases found."
  echo ""
  echo "To create a release:"
  echo "  1. Bump version: pnpm release"
  echo "  2. Push tags: git push --follow-tags"
  echo "  3. Release workflow will trigger on 'v*' tags"
  exit 0
fi

echo ""
echo "=== All Releases ==="
gh api "/repos/$REPO/releases" --jq '.[] | {
  tag: .tag_name,
  name: .name,
  draft: .draft,
  prerelease: .prerelease,
  published: .published_at,
  author: .author.login,
  assets_count: (.assets | length)
}' | jq -s '.' || echo "Failed to fetch releases"

echo ""
echo "=== Latest Release ==="
gh api "/repos/$REPO/releases/latest" --jq '{
  tag: .tag_name,
  name: .name,
  published: .published_at,
  author: .author.login,
  body: .body,
  assets: [.assets[] | {
    name: .name,
    size: .size,
    downloads: .download_count,
    content_type: .content_type,
    browser_download_url: .browser_download_url
  }]
}' 2>/dev/null || echo "No releases found"

echo ""
echo "=== Release Assets Details (Latest 5) ==="
gh api "/repos/$REPO/releases" --jq '.[:5] | .[] | {
  tag: .tag_name,
  assets: [.assets[] | {
    name: .name,
    size: .size,
    downloads: .download_count,
    created: .created_at
  }]
}' | jq -s '.' || echo "Failed to fetch release assets"

echo ""
echo "=== Git Tags (Latest 10) ==="
git tag --sort=-version:refname | head -10 || echo "No tags found"

echo ""
echo "=== Untagged Commits Since Last Release ==="
LATEST_TAG=$(git tag --sort=-version:refname | head -1 || echo "")
if [ -n "$LATEST_TAG" ]; then
  COMMIT_COUNT=$(git rev-list "$LATEST_TAG"..HEAD --count 2>/dev/null || echo "0")
  echo "Commits since $LATEST_TAG: $COMMIT_COUNT"
  if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo ""
    git log "$LATEST_TAG"..HEAD --oneline --no-decorate | head -20
  fi
else
  echo "No tags found - all commits are untagged"
  COMMIT_COUNT=$(git rev-list HEAD --count 2>/dev/null || echo "0")
  echo "Total commits: $COMMIT_COUNT"
fi

echo ""
echo "======================================"
echo "  Release Observation Complete"
echo "======================================"
