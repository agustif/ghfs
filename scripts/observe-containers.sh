#!/bin/bash
set -euo pipefail

REPO="agustif/ghfs"
OWNER="agustif"
PACKAGE_NAME="ghfs"

echo "======================================"
echo "  Container Images"
echo "======================================"

echo ""
echo "=== GitHub Container Registry (ghcr.io) ==="

# Try org packages first
ORG_PACKAGES=$(gh api "/orgs/$OWNER/packages?package_type=container" 2>/dev/null | jq ".[] | select(.name == \"$PACKAGE_NAME\")" || echo "")

if [ -n "$ORG_PACKAGES" ]; then
  echo "$ORG_PACKAGES" | jq '{
    name,
    visibility,
    created_at,
    updated_at,
    html_url,
    package_type
  }'
  
  echo ""
  echo "=== Container Versions ==="
  gh api "/orgs/$OWNER/packages/container/$PACKAGE_NAME/versions" --jq '.[] | {
    id,
    name,
    created_at,
    updated_at,
    html_url
  }' | jq -s '.' 2>/dev/null || echo "Failed to fetch versions"
else
  # Try user packages
  USER_PACKAGES=$(gh api "/users/$OWNER/packages?package_type=container" 2>/dev/null | jq ".[] | select(.name == \"$PACKAGE_NAME\")" || echo "")
  
  if [ -n "$USER_PACKAGES" ]; then
    echo "$USER_PACKAGES" | jq '{
      name,
      visibility,
      created_at,
      updated_at,
      html_url,
      package_type
    }'
    
    echo ""
    echo "=== Container Versions ==="
    gh api "/users/$OWNER/packages/container/$PACKAGE_NAME/versions" --jq '.[] | {
      id,
      name,
      created_at,
      updated_at,
      html_url
    }' | jq -s '.' 2>/dev/null || echo "Failed to fetch versions"
  else
    echo "No container images found at ghcr.io/$OWNER/$PACKAGE_NAME"
    echo ""
    echo "To publish containers:"
    echo "  1. Create Dockerfile"
    echo "  2. Add container build workflow"
    echo "  3. Push to ghcr.io with GitHub Actions"
  fi
fi

echo ""
echo "=== Docker Hub (docker.io) ==="
echo "Not configured - no Docker Hub credentials found"
echo ""
echo "To publish to Docker Hub:"
echo "  1. Add DOCKER_USERNAME and DOCKER_TOKEN secrets"
echo "  2. Update container workflow"
echo "  3. Build and push to docker.io/$OWNER/$PACKAGE_NAME"

echo ""
echo "======================================"
echo "  Container Observation Complete"
echo "======================================"
