/**
 * Example alchemy Stack for ghfs GitHub apply operations
 *
 * This example demonstrates using the agustif/alchemy fork to declaratively
 * manage GitHub resources (Labels, Milestones, Issues, Pull Requests).
 *
 * Usage:
 *   1. Install dependencies: pnpm install
 *   2. Set GITHUB_TOKEN environment variable
 *   3. Configure your repository in the Stack
 *   4. Run: npx tsx examples/alchemy/ghfs.run.ts
 *
 * The alchemy fork provides the "apply" side of ghfs two-way sync:
 *   - ghfs sync: Read GitHub → .ghfs/ (observe)
 *   - ghfs apply: .ghfs/ → GitHub via alchemy (apply)
 */

import { Effect } from "effect"
import { Alchemy } from "alchemy"
import * as GitHub from "alchemy/GitHub"

// Example: Declare desired GitHub resources
export default Alchemy.Stack(
  "ghfs-example",
  {
    providers: [GitHub.Providers],
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    // Example 1: Create/update a label
    yield* GitHub.Label({
      name: "ghfs:synced",
      color: "0969da",
      description: "Synced via ghfs + alchemy fork"
    })

    // Example 2: Create/update a milestone
    yield* GitHub.Milestone({
      title: "Q4 2026",
      description: "Fourth quarter 2026 goals",
      due_on: "2026-12-31T23:59:59Z"
    })

    // Example 3: Create/update an issue
    yield* GitHub.Issue({
      title: "Example: Declarative GitHub management via alchemy",
      body: `
This issue demonstrates ghfs + alchemy fork integration for declarative GitHub resource management.

## Features

- Labels, Milestones, Issues, PRs as Effect programs
- Type-safe resource declarations
- Plan/apply workflow (like Terraform)
- Two-way sync: ghfs reads, alchemy applies

## Resources Available

See [docs/alchemy-fork-inventory.md](../../docs/alchemy-fork-inventory.md) for the complete list of resources available in the agustif/alchemy fork.
      `.trim(),
      labels: ["ghfs:synced", "documentation"],
      milestone: "Q4 2026"
    })

    // Example 4: Create/update a wiki page
    yield* GitHub.WikiPage({
      title: "Home",
      content: `
# Welcome to the ghfs + alchemy Example

This wiki page was created declaratively using the agustif/alchemy fork.

## About

- **Repository**: Example ghfs integration
- **Stack**: ghfs.run.ts
- **Resources**: Labels, Milestones, Issues, Wiki Pages
- **Status**: Two-way sync enabled

## Resources

- [ghfs Repository](https://github.com/agustif/ghfs)
- [alchemy Fork](https://github.com/agustif/alchemy)
- [Epic #6: GitHub provider for ghfs](https://github.com/agustif/alchemy/issues/6)
      `.trim()
    })
  })
)

/**
 * Running this Stack:
 *
 * 1. Plan (show what would change):
 *    npx alchemy plan
 *
 * 2. Apply (execute changes):
 *    npx alchemy deploy
 *
 * 3. Destroy (remove resources):
 *    npx alchemy destroy
 *
 * Note: This is a minimal example. Real usage would:
 * - Load resources from .ghfs/ filesystem
 * - Generate Stack from synced state
 * - Use ghfs CLI commands for workflow integration
 */
