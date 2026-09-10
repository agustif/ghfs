# Packages & Releases Observatory - Quick Start

## 🚀 One-Command Health Check

```bash
pnpm observe:all
```

## 📊 Individual Observations

```bash
# NPM package status
pnpm observe:packages

# GitHub releases
pnpm observe:releases

# Container images
pnpm observe:containers

# Deployment status
pnpm observe:deployments

# Security attestations
pnpm observe:attestations
```

## 🎯 What You Get

### Current State (agustif/ghfs fork)

**✅ Working:**
- NPM package: `@ghfs/cli@0.2.5`
- 13 versions published (0.0.0 → 0.2.5)
- 98 downloads last month
- Upstream maintained by antfu

**⏳ Ready to Configure:**
- GitHub Releases (0 currently)
- Container Images (infrastructure ready)
- Deployments (templates ready)
- Attestations (enabled in workflow)

## 📋 Quick Tasks

### Check Package Health
```bash
pnpm observe:packages
```
Shows: versions, downloads, size, metadata

### See Release Status
```bash
pnpm observe:releases
```
Shows: tags, releases, untagged commits

### Verify Security
```bash
pnpm observe:attestations
```
Shows: provenance, SLSA, checksums

## 🤖 Automation

### Scheduled Runs
- **Weekly:** Every Sunday at midnight UTC
- **On Release:** Triggered by `v*` tags
- **Manual:** Run from Actions UI anytime

### Workflow
```bash
gh workflow run observe-releases.yml
```

## 📚 Full Documentation

- **[CURATOR-SUMMARY.md](./CURATOR-SUMMARY.md)** - Complete delivery summary
- **[docs/packages-releases.md](./docs/packages-releases.md)** - Comprehensive guide
- **[scripts/README.md](./scripts/README.md)** - Scripts documentation

## 🛠️ Requirements

- `gh` CLI (authenticated)
- `npm` / `pnpm`
- `jq` (JSON processor)
- `bash`

## 🎉 That's It!

Run `pnpm observe:all` to see everything in action.
