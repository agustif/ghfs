# Alchemy Fork Integration Examples

This directory contains examples of using the [agustif/alchemy](https://github.com/agustif/alchemy) fork with ghfs for declarative GitHub resource management.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set your GitHub token:
   ```bash
   export GITHUB_TOKEN="your_github_token"
   ```

3. Configure your repository in the Stack file

## Examples

### `ghfs.run.ts` - Basic GitHub Resources

Demonstrates declarative management of:
- Labels
- Milestones  
- Issues
- Wiki Pages

Run with:
```bash
npx tsx examples/alchemy/ghfs.run.ts
```

Or use alchemy CLI:
```bash
npx alchemy plan    # Preview changes
npx alchemy deploy  # Apply changes
```

## Available Resources

The agustif/alchemy fork provides these GitHub resources:

**Core Resources** (Apply/Declare):
- Label
- Milestone
- Issue
- PullRequest
- WikiPage
- Release
- Collaborator
- TeamAccess
- Ruleset
- BranchProtection
- Environment
- Secret / Secrets
- Variable / Variables
- Webhook
- Comment

See [docs/alchemy-fork-inventory.md](../../docs/alchemy-fork-inventory.md) for complete details.

## Two-Way Sync Pattern

```
ghfs sync     →  Read GitHub state → .ghfs/ filesystem (observe)
ghfs apply    →  .ghfs/ → alchemy Stack → GitHub API (apply)
```

The alchemy fork handles the **apply** direction, while ghfs handles the **observe** direction.

## Resources

- [alchemy Fork](https://github.com/agustif/alchemy)
- [Epic #6: GitHub provider for ghfs two-way sync](https://github.com/agustif/alchemy/issues/6)
- [alchemy.run Documentation](https://alchemy.run/)
- [ghfs Repository](https://github.com/agustif/ghfs)
