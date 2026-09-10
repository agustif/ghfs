#!/bin/bash
set -euo pipefail

echo "======================================"
echo "  NPM Package: @ghfs/cli"
echo "======================================"

echo ""
echo "=== All Published Versions ==="
npm view @ghfs/cli versions --json | jq -r '.[]' || echo "Failed to fetch versions"

echo ""
echo "=== Latest Version ==="
npm view @ghfs/cli version || echo "Failed to fetch version"

echo ""
echo "=== Dist Tags ==="
npm view @ghfs/cli dist-tags --json || echo "Failed to fetch dist-tags"

echo ""
echo "=== Package Metadata ==="
npm view @ghfs/cli --json 2>/dev/null | jq '{
  name,
  version,
  description,
  license,
  homepage,
  repository,
  keywords,
  author,
  maintainers: [.maintainers[] | {name, email}],
  dependencies: .dependencies | keys,
  devDependencies: .devDependencies | keys,
  engines,
  publishedAt: .time[.version]
}' || echo "Failed to fetch metadata"

echo ""
echo "=== Package Size ==="
SIZE=$(npm view @ghfs/cli dist.unpackedSize 2>/dev/null || echo "0")
if [ "$SIZE" != "0" ]; then
  echo "Unpacked: $(numfmt --to=iec-i --suffix=B "$SIZE" 2>/dev/null || echo "$SIZE bytes")"
else
  echo "Failed to fetch size"
fi

echo ""
echo "=== Download Stats (Last Month) ==="
curl -s "https://api.npmjs.org/downloads/point/last-month/@ghfs/cli" | jq . || echo "Failed to fetch download stats"

echo ""
echo "=== Download Stats (Last Week) ==="
curl -s "https://api.npmjs.org/downloads/point/last-week/@ghfs/cli" | jq . || echo "Failed to fetch download stats"

echo ""
echo "=== Recent Version History ==="
npm view @ghfs/cli time --json | jq 'to_entries | map(select(.key != "modified" and .key != "created")) | sort_by(.value) | reverse | .[0:10] | .[] | "\(.key): \(.value)"' -r || echo "Failed to fetch version history"

echo ""
echo "=== GitHub Packages (if any) ==="
gh api /orgs/agustif/packages 2>/dev/null | jq '.[] | select(.name == "ghfs")' || \
  gh api /users/agustif/packages 2>/dev/null | jq '.[] | select(.name == "ghfs")' || \
  echo "No GitHub Packages found for 'ghfs'"

echo ""
echo "======================================"
echo "  Package Observation Complete"
echo "======================================"
