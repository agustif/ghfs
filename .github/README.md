# .github Directory

This directory contains GitHub-specific configuration files for the agustif/ghfs repository.

## Contents

### Automation Documentation
- **[WEBHOOKS_AND_AUTOMATION.md](./WEBHOOKS_AND_AUTOMATION.md)** - Comprehensive human-readable documentation of webhooks, workflows, and automation configuration
- **[automation-config.json](./automation-config.json)** - Structured JSON representation for programmatic access

### Workflows (`workflows/`)
The repository uses GitHub Actions for CI/CD with 4 active workflows:

1. **[release.yml](./workflows/release.yml)** - Automated releases on version tags
2. **[unit-test.yml](./workflows/unit-test.yml)** - Unit tests and coverage on main/PRs
3. **[e2e.yml](./workflows/e2e.yml)** - End-to-end Playwright tests
4. **[autofix.yml](./workflows/autofix.yml)** - Automated code fixes via autofix.ci

### Funding
- **[FUNDING.yml](./FUNDING.yml)** - GitHub Sponsors and Open Collective configuration

## Workflow Architecture

### Reusable Workflows
Most workflows leverage the `sxzz/workflows` library at version `@v1`:
- Standardized CI/CD patterns
- Consistent configuration across projects
- Maintained separately from this repository

### Permissions Model
Workflows follow the **least privilege** principle:
- Default to `permissions: {}` (no permissions)
- Grant specific permissions per job as needed
- Use OIDC tokens (`id-token: write`) for secure authentication

### Testing Strategy

```
┌─────────────────────┐
│   Pull Request      │
└──────────┬──────────┘
           │
           ├──► Unit Test (Node 22, 24)
           ├──► E2E Test (Playwright)
           └──► autofix.ci (Auto-fixes)
           
┌─────────────────────┐
│   Push to main      │
└──────────┬──────────┘
           │
           ├──► Unit Test + Coverage
           └──► E2E Test
           
┌─────────────────────┐
│   Version Tag (v*)  │
└──────────┬──────────┘
           │
           └──► Release + Publish
```

## Integration Points

### External Services
- **sxzz/workflows** - Reusable workflow library
- **autofix.ci** - Automated code quality fixes
- **Playwright** - Browser-based E2E testing
- **Vitest** - Unit testing and coverage
- **Codecov** (via coverage workflow)

### Git Hooks
Pre-commit hooks are configured via `simple-git-hooks` in `package.json`:
```bash
pnpm i --frozen-lockfile --ignore-scripts --offline && npx lint-staged
```

## Maintenance Guidelines

### Adding a New Workflow
1. Create workflow file in `.github/workflows/`
2. Define clear triggers (push, pull_request, etc.)
3. Set minimal required permissions
4. Update documentation in `WEBHOOKS_AND_AUTOMATION.md`
5. Update workflow list in `automation-config.json`

### Modifying Existing Workflows
1. Test changes in a fork or draft PR
2. Update inline documentation/comments
3. Update `WEBHOOKS_AND_AUTOMATION.md` if structure changes
4. Update `automation-config.json` if metadata changes

### Security Best Practices
- ✅ Never commit secrets or tokens
- ✅ Use OIDC tokens over long-lived credentials
- ✅ Pin action versions (`@v4` not `@latest`)
- ✅ Review reusable workflow sources
- ✅ Use `--frozen-lockfile` for dependencies
- ✅ Enable branch protection on main

## Troubleshooting

### Workflow Not Triggering
- Check workflow triggers match event (push/PR/tag)
- Verify branch name matches trigger branches
- Check if workflow file has syntax errors
- Review GitHub Actions status page

### Failed Workflow Run
- Review workflow logs in Actions tab
- Check if dependencies are up to date
- Verify secrets/variables are configured
- Test locally with `act` if possible

### autofix.ci Not Working
- Ensure the GitHub App is installed
- Check app has required repository permissions
- Verify workflow has `contents: read` at minimum

## Documentation Updates

This directory's documentation should be kept in sync when:
- Workflows are added, removed, or significantly modified
- Integration services change
- Permission requirements change
- New secrets or variables are required

Last updated: 2026-09-10
