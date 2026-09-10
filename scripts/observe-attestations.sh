#!/bin/bash
set -euo pipefail

REPO="agustif/ghfs"
OWNER="agustif"

echo "======================================"
echo "  Attestations & Provenance: $REPO"
echo "======================================"

echo ""
echo "=== NPM Provenance ==="
echo "Checking if @ghfs/cli has npm provenance..."
PROVENANCE=$(npm view @ghfs/cli --json 2>/dev/null | jq '.provenance' 2>/dev/null || echo "null")
if [ "$PROVENANCE" != "null" ]; then
  echo "✅ NPM Provenance enabled"
  echo "$PROVENANCE"
else
  echo "⚠️  NPM Provenance not found"
  echo ""
  echo "The release workflow includes 'id-token: write' permission."
  echo "Provenance will be automatically added on next publish."
fi

echo ""
echo "=== GitHub Attestations ==="
echo "Checking for SLSA attestations..."

# Check if gh attestation command is available
if gh attestation --help &>/dev/null; then
  ATTESTATION_OUTPUT=$(gh attestation list --owner "$OWNER" --repo ghfs --limit 50 2>&1 || echo "")
  
  if echo "$ATTESTATION_OUTPUT" | grep -q "no attestations found"; then
    echo "⚠️  No attestations found"
    echo ""
    echo "To enable attestations:"
    echo "  1. Add 'attestations: write' permission to workflow"
    echo "  2. Use actions/attest-build-provenance@v1"
    echo "  3. Attestations will be created on next release"
  elif [ -n "$ATTESTATION_OUTPUT" ]; then
    echo "✅ Attestations found:"
    echo "$ATTESTATION_OUTPUT"
  else
    echo "⚠️  Unable to check attestations"
  fi
else
  echo "⚠️  'gh attestation' command not available"
  echo "Install with: gh extension install github/gh-attestation"
fi

echo ""
echo "=== Sigstore Transparency Log ==="
echo "Checking Sigstore/Rekor for @ghfs/cli..."
# Note: Requires rekor-cli or API calls
echo "⚠️  Manual check required - visit:"
echo "https://search.sigstore.dev/?hash=$(npm view @ghfs/cli dist.integrity 2>/dev/null | cut -d'-' -f2 | head -c 64 || echo '')"

echo ""
echo "=== SLSA Build Level ==="
echo "Analyzing workflow for SLSA compliance..."

if [ -f ".github/workflows/release.yml" ]; then
  echo "Release workflow found:"
  
  # Check for required permissions
  if grep -q "id-token: write" .github/workflows/release.yml; then
    echo "  ✅ id-token: write (enables provenance)"
  else
    echo "  ⚠️  id-token: write not found"
  fi
  
  if grep -q "attestations: write" .github/workflows/release.yml; then
    echo "  ✅ attestations: write (enables attestations)"
  else
    echo "  ⚠️  attestations: write not found"
  fi
  
  if grep -q "actions/attest" .github/workflows/release.yml; then
    echo "  ✅ actions/attest-build-provenance used"
  else
    echo "  ⚠️  actions/attest-build-provenance not used"
  fi
  
  echo ""
  echo "Estimated SLSA Level: 2-3 (with provenance enabled)"
else
  echo "⚠️  No release workflow found"
fi

echo ""
echo "=== Artifact Attestations (Actions Artifacts) ==="
ARTIFACT_COUNT=$(gh api "/repos/$REPO/actions/artifacts" --jq '.total_count' 2>/dev/null || echo "0")
echo "Total artifacts: $ARTIFACT_COUNT"

if [ "$ARTIFACT_COUNT" -gt 0 ]; then
  echo ""
  echo "Recent artifacts:"
  gh api "/repos/$REPO/actions/artifacts" --jq '.artifacts[:5] | .[] | {
    name,
    size_in_bytes,
    created_at,
    expired,
    workflow_run: .workflow_run.id
  }' | jq -s '.' 2>/dev/null || echo "Failed to fetch artifacts"
fi

echo ""
echo "=== Security & Dependency Verification ==="
echo "Package checksums from npm:"
npm view @ghfs/cli dist --json 2>/dev/null | jq '{
  integrity: .integrity,
  shasum: .shasum,
  tarball: .tarball
}' || echo "Failed to fetch checksums"

echo ""
echo "======================================"
echo "  Attestation Observation Complete"
echo "======================================"
