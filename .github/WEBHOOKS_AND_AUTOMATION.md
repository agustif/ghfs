# Webhooks & Automation Configuration

This document provides a comprehensive mirror of the webhooks, automation, and GitHub configuration for the `agustif/ghfs` repository.

**Generated:** 2026-09-10  
**Repository:** agustif/ghfs  
**Visibility:** Public

---

## Repository Metadata

```json
{
  "name": "ghfs",
  "owner": "agustif",
  "visibility": "public",
  "default_branch": "main",
  "has_issues": true,
  "has_projects": true,
  "has_wiki": true,
  "has_pages": false,
  "has_discussions": true,
  "archived": false,
  "disabled": false
}
```

---

## GitHub Actions Workflows

### Active Workflows

The repository has **4 active workflows**:

#### 1. Release Workflow
- **File:** `.github/workflows/release.yml`
- **Name:** Release
- **ID:** 354782871
- **State:** Active
- **Trigger:** Push to tags matching `v*`
- **Reusable Workflow:** `sxzz/workflows/.github/workflows/release.yml@v1`
- **Permissions:**
  - `contents: write`
  - `id-token: write`
- **Configuration:**
  ```yaml
  with:
    publish: true
  ```

#### 2. Unit Test Workflow
- **File:** `.github/workflows/unit-test.yml`
- **Name:** Unit Test
- **ID:** 354782872
- **State:** Active
- **Trigger:** 
  - Push to `main` branch
  - Pull requests to `main` branch
- **Reusable Workflows:**
  - `sxzz/workflows/.github/workflows/unit-test.yml@v1`
  - `sxzz/workflows/.github/workflows/coverage.yml@v1`
- **Default Permissions:** None (`permissions: {}`)
- **Job Permissions:**
  - Coverage job: `id-token: write`
- **Configuration:**
  ```yaml
  with:
    node-versions: '22,24'
    skip-test: true
  ```

#### 3. E2E Workflow
- **File:** `.github/workflows/e2e.yml`
- **Name:** E2E
- **ID:** 354782870
- **State:** Active
- **Trigger:**
  - Push to `main` branch
  - Pull requests to `main` branch
- **Permissions:** None (`permissions: {}`)
- **Runner:** `ubuntu-latest`
- **Steps:**
  1. Checkout with recursive submodules
  2. Setup pnpm
  3. Setup Node.js v22 with pnpm cache
  4. Install dependencies (frozen lockfile)
  5. Install Playwright browsers (chromium only)
  6. Build project
  7. Run Playwright E2E tests
  8. Upload test reports on failure (7-day retention)

#### 4. Autofix Workflow
- **File:** `.github/workflows/autofix.yml`
- **Name:** autofix.ci
- **ID:** 354782869
- **State:** Active
- **Trigger:** All pull requests
- **Reusable Workflow:** `sxzz/workflows/.github/workflows/autofix.yml@v1`
- **Permissions:**
  - `contents: read`

---

## GitHub Actions Configuration

### Workflow Permissions
> **Note:** Repository-level default workflow permissions could not be accessed via API. Permissions are explicitly set per workflow.

### Secrets
> **Note:** Secret names and metadata could not be accessed due to API permissions. Secrets are configured but values are redacted for security.

### Variables
> **Note:** Repository variables could not be accessed via API permissions.

---

## Webhooks

> **Note:** Webhook configurations could not be accessed via the GitHub API due to integration permissions. If webhooks are configured, they would typically include:
> - Push events
> - Pull request events
> - Issue events
> - Workflow run events
> 
> **Secret handling:** Webhook secrets, if present, are never stored in plaintext and are redacted from all documentation.

---

## GitHub App Installations

> **Note:** GitHub App installation details could not be accessed via API. The repository may have the following apps installed based on workflow integrations:
> - **autofix.ci** - Referenced in `.github/workflows/autofix.yml`
> - Standard GitHub Actions integration

---

## Autolinks

> **Note:** Autolink configurations could not be accessed via API permissions. No autolink references are configured in repository files.

---

## Environments

**Total Environments:** 0

No deployment environments are currently configured for this repository.

---

## Branch Protection Rules

> **Note:** Branch protection rules for the `main` branch could not be accessed via API permissions.

**Observed Behaviors:**
- Pull request workflows run on all PRs to `main`
- Push workflows run on direct pushes to `main`

---

## Repository Rulesets

**Total Rulesets:** 0

No repository rulesets are currently configured.

---

## Collaborators & Permissions

### Repository Collaborators

| Login | Permissions |
|-------|------------|
| agustif | admin, maintain, push, pull, triage |

---

## Git Hooks (Local)

The repository configures local git hooks via `simple-git-hooks`:

```json
{
  "pre-commit": "pnpm i --frozen-lockfile --ignore-scripts --offline && npx lint-staged"
}
```

### Pre-commit Actions:
1. Install dependencies (frozen lockfile, offline mode, skip scripts)
2. Run lint-staged on changed files
3. ESLint auto-fix on all staged files

---

## Funding Configuration

**File:** `.github/FUNDING.yml`

```yaml
github: [antfu]
opencollective: antfu
```

---

## Integration Matrix

### Third-Party Services

Based on workflow analysis:

| Service | Purpose | Configuration |
|---------|---------|---------------|
| sxzz/workflows | Reusable workflow library | Multiple workflows reference `@v1` |
| autofix.ci | Automated code fixing on PRs | Triggered on all pull requests |
| Playwright | E2E testing | Chromium browser, tests in `tests/e2e/` |
| Vitest | Unit testing & coverage | Node versions 22, 24 |
| npm/pnpm | Package management | pnpm@11.9.0 |

---

## Security Notes

1. **Secrets Redaction:** All webhook secrets and GitHub tokens are redacted and never stored in plaintext
2. **OIDC Tokens:** Workflows use `id-token: write` for secure authentication without long-lived credentials
3. **Minimal Permissions:** Most workflows default to no permissions, granting only what's required per job
4. **Frozen Dependencies:** Lockfile is enforced in CI/CD and pre-commit hooks
5. **Submodule Security:** Repository includes git submodules that are recursively initialized

---

## API Limitations

The following configurations could not be fully observed due to GitHub API integration permissions:

- ❌ Webhook configurations (URL, events, secrets)
- ❌ GitHub App installation metadata
- ❌ Repository secrets (names and metadata)
- ❌ Repository variables
- ❌ Actions default workflow permissions
- ❌ Branch protection rules details
- ❌ Autolink configurations

These limitations do not affect the accuracy of the documented workflows and configurations that are stored in the repository files.

---

## Maintenance

This document should be updated when:
- New workflows are added or modified
- Webhook configurations change
- GitHub App integrations are added or removed
- Environment protection rules are modified
- Repository settings affecting automation change

**Last Updated:** 2026-09-10
