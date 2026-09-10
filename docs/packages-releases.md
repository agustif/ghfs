# Packages & Releases Curator

Comprehensive observability and management for ghfs packages, releases, containers, attestations, and deployments.

## Current State

### NPM Package: `@ghfs/cli`

**Latest Published Version:** `0.2.5` (upstream antfu/ghfs)

```bash
npm view @ghfs/cli
```

**Published Versions:**
- 0.0.0 through 0.0.4 (initial releases)
- 0.1.0, 0.1.1 (minor bump)
- 0.2.0 through 0.2.5 (current)

### Repository: agustif/ghfs (fork)

**Releases:** None yet
**Packages:** None yet
**Deployments:** None yet
**Artifacts:** None yet

## Release Infrastructure

### Release Workflow

The repository uses a reusable workflow for releases:

```yaml
# .github/workflows/release.yml
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    uses: sxzz/workflows/.github/workflows/release.yml@v1
    with:
      publish: true
```

**Triggered by:** Git tags matching `v*` pattern (e.g., `v0.2.6`, `v0.3.0`)

**Actions:**
1. Build the package (`pnpm build`)
2. Publish to npm (`npm publish`)
3. Create GitHub Release with auto-generated notes

### Creating a Release

```bash
# Bump version and create tag
pnpm release

# Or manually:
npm version patch  # or minor, major
git push --follow-tags
```

## Package Metadata Observation

### NPM Package Information

```bash
# View current version
npm view @ghfs/cli version

# View all versions
npm view @ghfs/cli versions

# View package metadata
npm view @ghfs/cli

# View dist-tags
npm view @ghfs/cli dist-tags

# Download counts (via npm-stat.com API)
curl "https://api.npmjs.org/downloads/point/last-month/@ghfs/cli"
```

### GitHub Package Registry

Currently not configured. To enable:

1. Add `.npmrc` with GitHub Package Registry config
2. Update workflow to publish to both npm and GitHub Packages
3. Add package authentication

## Container Images

Not currently configured. To add Docker/OCI container support:

### Option 1: GitHub Container Registry (ghcr.io)

```dockerfile
# Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "dist/cli.mjs"]
```

```yaml
# .github/workflows/container.yml
name: Container Build
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

### Option 2: Docker Hub

Configure `DOCKER_USERNAME` and `DOCKER_TOKEN` secrets, push to `docker.io/<username>/ghfs`.

## Attestations & Provenance

### NPM Provenance (Enabled)

The release workflow includes `id-token: write` permission, enabling npm provenance:

```yaml
permissions:
  contents: write
  id-token: write
```

**Benefits:**
- Cryptographically verifiable build provenance
- Links package to source commit and workflow run
- Visible on npm package page

**Verify:**
```bash
npm view @ghfs/cli --json | jq .provenance
```

### Sigstore Attestations

For additional security, add Sigstore signing:

```yaml
# In release workflow
- uses: actions/attest-build-provenance@v1
  with:
    subject-path: 'dist/**'
```

### SLSA Provenance

Generate SLSA Build Level 3 provenance:

```yaml
jobs:
  build:
    permissions:
      id-token: write
      contents: read
      attestations: write
    steps:
      - name: Attest
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: dist/
```

## Deployment Statuses

### Current Setup

No deployment environments configured yet.

### Recommended Deployment Targets

#### 1. NPM Registry (Already Configured)

- **Environment:** `npm`
- **URL:** https://www.npmjs.com/package/@ghfs/cli
- **Trigger:** Git tags (`v*`)

#### 2. GitHub Releases (Already Configured)

- **Environment:** `github-releases`
- **URL:** `https://github.com/agustif/ghfs/releases`
- **Trigger:** Git tags (`v*`)

#### 3. Demo/Preview Deployments (Proposed)

Deploy `ghfs hub` as a live demo:

```yaml
# .github/workflows/deploy-demo.yml
name: Deploy Demo
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: demo
      url: https://ghfs-demo.vercel.app
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Observability Queries

### Release Assets Metadata

```bash
#!/bin/bash
# scripts/observe-releases.sh

gh api /repos/agustif/ghfs/releases \
  --jq '.[] | {
    tag: .tag_name,
    name: .name,
    draft: .draft,
    prerelease: .prerelease,
    published: .published_at,
    author: .author.login,
    assets: [.assets[] | {
      name: .name,
      size: .size,
      downloads: .download_count,
      content_type: .content_type
    }]
  }'
```

### Package Versions

```bash
#!/bin/bash
# scripts/observe-packages.sh

echo "=== NPM Package: @ghfs/cli ==="
npm view @ghfs/cli versions --json | jq -r '.[]'

echo -e "\n=== Latest Version ==="
npm view @ghfs/cli version

echo -e "\n=== Dist Tags ==="
npm view @ghfs/cli dist-tags --json

echo -e "\n=== Package Size ==="
npm view @ghfs/cli dist.unpackedSize
```

### Container Metadata

```bash
#!/bin/bash
# scripts/observe-containers.sh

# GitHub Container Registry
gh api /users/agustif/packages?package_type=container \
  --jq '.[] | select(.name == "ghfs") | {
    name,
    visibility,
    created_at,
    updated_at,
    html_url
  }'

# Get container versions
gh api /users/agustif/packages/container/ghfs/versions \
  --jq '.[] | {
    id,
    name,
    created_at,
    updated_at,
    metadata: .metadata
  }'
```

### Deployment Statuses

```bash
#!/bin/bash
# scripts/observe-deployments.sh

gh api /repos/agustif/ghfs/deployments \
  --jq '.[] | {
    id,
    environment,
    ref,
    created_at,
    updated_at,
    statuses_url
  }' | head -20

# Get deployment statuses
for deployment_id in $(gh api /repos/agustif/ghfs/deployments --jq '.[].id' | head -5); do
  echo "=== Deployment $deployment_id ==="
  gh api "/repos/agustif/ghfs/deployments/$deployment_id/statuses" \
    --jq '.[] | {state, description, created_at, target_url}'
done
```

### Attestations

```bash
#!/bin/bash
# scripts/observe-attestations.sh

# List attestations for a specific version
VERSION="v0.2.5"
gh attestation list --owner agustif --repo ghfs --limit 50 | grep "$VERSION"

# Verify attestation
gh attestation verify dist/ --owner agustif --repo ghfs
```

## Configuration Toggles

### Environment Variables

```bash
# .env.example
GHFS_PUBLISH_NPM=true
GHFS_PUBLISH_GITHUB_PACKAGES=false
GHFS_BUILD_CONTAINERS=false
GHFS_CREATE_ATTESTATIONS=true
GHFS_DEPLOY_DEMO=false
```

### Release Configuration

```typescript
// release.config.ts
export default {
  targets: {
    npm: true,
    githubPackages: false,
    containers: false,
  },
  attestations: {
    slsa: true,
    sigstore: true,
  },
  deployments: {
    demo: false,
  },
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "observe:packages": "bash scripts/observe-packages.sh",
    "observe:releases": "bash scripts/observe-releases.sh",
    "observe:containers": "bash scripts/observe-containers.sh",
    "observe:deployments": "bash scripts/observe-deployments.sh",
    "observe:attestations": "bash scripts/observe-attestations.sh",
    "observe:all": "npm run observe:packages && npm run observe:releases && npm run observe:containers && npm run observe:deployments && npm run observe:attestations"
  }
}
```

## Bounded Scope

This curator focuses on **observability only** for:

1. ✅ **Releases** - GitHub Releases, tags, release assets
2. ✅ **Packages** - npm packages, GitHub Packages
3. ✅ **Containers** - Container images (when configured)
4. ✅ **Attestations** - Build provenance, SLSA, Sigstore
5. ✅ **Deployments** - Deployment statuses and environments

**Out of Scope:**
- Code changes to src/
- Feature development
- Bug fixes
- Documentation (except release-related)
- CI/CD changes (except release workflows)

## Recommended Next Steps

### For Fork Maintainer (agustif)

1. **Decide on versioning strategy:**
   - Keep version in sync with upstream antfu/ghfs?
   - Use independent versioning?
   - Use scope like `@agustif/ghfs`?

2. **Configure npm publishing:**
   - Update `repository` field in package.json
   - Configure npm token in GitHub Secrets
   - Test release workflow

3. **Optional enhancements:**
   - Add container builds
   - Enable GitHub Packages
   - Set up demo deployment
   - Configure deployment environments

4. **Observability:**
   - Run observation scripts regularly
   - Monitor download counts
   - Track release adoption
   - Review attestations

## References

- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Packages](https://docs.github.com/en/packages)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Sigstore](https://www.sigstore.dev/)
- [SLSA](https://slsa.dev/)
- [GitHub Deployments API](https://docs.github.com/en/rest/deployments)
