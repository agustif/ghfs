# OAuth Scopes for ghfs

This document lists the GitHub OAuth scopes (permissions) required for different features in ghfs.

## Core Features

### Issues and Pull Requests Sync

**Scope Required:** `repo` (for private repositories) or `public_repo` (for public repositories only)

This scope allows ghfs to:
- Read issues and pull requests
- Read comments and reviews
- Read labels, milestones, and assignees
- Read pull request patches and commits

## Extended Features

### GitHub Actions

**Scopes Required:**
- `repo` (or `public_repo` for public repositories)
- `actions:read` (GitHub App permission)

For **Personal Access Tokens (classic)**, use:
- `repo` scope (includes Actions read access)

For **Fine-grained Personal Access Tokens**, enable:
- **Repository permissions:**
  - Actions: Read-only
  - Contents: Read-only
  - Metadata: Read-only

**What Actions sync includes:**
- Workflow run metadata
- Job logs (with configurable size limits)
- Artifacts metadata (list only, no downloads)

**Config options:**
```typescript
{
  sync: {
    actionsLogs: 'failed' | 'recent' | false,
    actionsLogsMaxKb: 512, // default
    actionsArtifacts: boolean
  }
}
```

### Webhooks

**Scopes Required:**
- `repo` (or `public_repo` for public repositories)
- `admin:repo_hook` (for webhook management)

For **Fine-grained Personal Access Tokens**, enable:
- **Repository permissions:**
  - Webhooks: Read-only
  - Metadata: Read-only

**What Webhooks sync includes:**
- Webhook configurations (with secret redaction)
- Recent webhook deliveries (configurable limit)
- Delivery status and response metadata

**Security Notes:**
- Webhook secret tokens are **never** stored in plaintext
- Webhook URLs have their hostnames redacted
- Only delivery metadata is stored (no request/response payloads by default)

**Config options:**
```typescript
{
  sync: {
    webhooks: boolean,
    webhooksMaxDeliveries: 50 // default
  }
}
```

## Creating a Personal Access Token

### Classic Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Select scopes:
   - For **issues/PRs only**: `repo` (or `public_repo`)
   - For **issues/PRs + Actions**: `repo` + `actions:read`
   - For **issues/PRs + webhooks**: `repo` + `admin:repo_hook`
   - For **all features**: `repo` + `actions:read` + `admin:repo_hook`
4. Generate and copy the token

### Fine-grained Token

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Set:
   - **Token name**: ghfs-sync
   - **Resource owner**: Your username or organization
   - **Repository access**: Select repositories
4. Set **Repository permissions**:
   - **Contents**: Read-only (required for all features)
   - **Issues**: Read-only (required for issues)
   - **Pull requests**: Read-only (required for PRs)
   - **Metadata**: Read-only (required for all features)
   - **Actions**: Read-only (optional, for Actions sync)
   - **Webhooks**: Read-only (optional, for webhook sync)
5. Generate and copy the token

## Using the Token

Set the token in one of these ways:

1. **Config file** (`ghfs.config.ts`):
   ```typescript
   export default {
     auth: {
       token: 'ghp_...'
     }
   }
   ```

2. **Environment variable**:
   ```bash
   export GITHUB_TOKEN=ghp_...
   export GH_TOKEN=ghp_...
   ```

3. **GitHub CLI** (if installed):
   ```bash
   gh auth login
   ```

4. **Interactive prompt** (if running in a TTY and no token found):
   ```bash
   ghfs sync
   # Will prompt for token
   ```

## Token Security Best Practices

1. **Never commit tokens to version control**
   - Use environment variables or local config files
   - Add `ghfs.config.ts` to `.gitignore` if it contains tokens

2. **Use fine-grained tokens when possible**
   - Limit access to specific repositories
   - Set expiration dates
   - Grant only required permissions

3. **Rotate tokens regularly**
   - Regenerate tokens every 90 days
   - Revoke unused tokens immediately

4. **Use GitHub CLI for local development**
   - `gh auth login` stores tokens securely
   - No need to manage tokens manually

## Troubleshooting

### "Resource not accessible by personal access token"

This usually means:
- The token doesn't have the required scope
- The repository is private but you're using `public_repo` scope
- The token has expired

**Solution:** Regenerate the token with the correct scopes.

### Actions logs return empty or error

Possible causes:
- Missing `actions:read` permission
- Logs have expired (GitHub retains logs for 90 days)
- The repository doesn't use GitHub Actions

**Solution:** Enable `actions:read` permission and check that Actions are enabled for the repo.

### Webhook sync fails

Possible causes:
- Missing `admin:repo_hook` permission
- You don't have admin access to the repository
- The repository has no webhooks configured

**Solution:** Ensure you have admin access and the `admin:repo_hook` scope.

## REST API Endpoints Used

### Issues and Pull Requests
- `GET /repos/{owner}/{repo}/issues`
- `GET /repos/{owner}/{repo}/issues/{issue_number}`
- `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`
- `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/commits`
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments`

### Actions
- `GET /repos/{owner}/{repo}/actions/runs`
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`
- `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts`

### Webhooks
- `GET /repos/{owner}/{repo}/hooks`
- `GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries`

## See Also

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Fine-grained Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-fine-grained-personal-access-token)
