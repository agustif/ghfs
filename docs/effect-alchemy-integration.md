# Effect + alchemy.run Integration for ghfs

## Purpose

This document specifies the Effect v4 RC + alchemy.run v2 integration for `ghfs` desired-state management. Instead of building a parallel DSL, we implement GitHub resources as alchemy.run Resource types and use alchemy's plan/apply infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ghfs CLI (existing codebase)                               │
│  - ghfs sync     → fetch observed state                     │
│  - ghfs status   → show drift (delegates to alchemy plan)   │
│  - ghfs apply    → delegates to alchemy deploy              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  ghfs.run.ts (alchemy Stack)                                │
│  - Exports Alchemy.Stack with GitHub providers             │
│  - Declares resources via Effect.gen + yield*              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Provider (@ghfs/alchemy-github)                     │
│  - Resource types: Issue, Pull, Label, Milestone           │
│  - Provider Layer: implements reconcile/delete             │
│  - Uses Octokit for GitHub API calls                       │
└─────────────────────────────────────────────────────────────┘
```

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "effect": "4.0.0-rc",
    "@effect/platform": "4.0.0-rc",
    "@effect/schema": "4.0.0-rc",
    "alchemy": "^2.0.0"
  }
}
```

## Resource Declarations

### GitHub Issue Resource

```typescript
// src/alchemy/resources/issue.ts
import { Effect, Schema } from "effect"
import { Resource } from "alchemy"

// Props Schema (input)
export const IssuePropsSchema = Schema.Struct({
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  body: Schema.optional(Schema.String),
  labels: Schema.optional(Schema.Array(Schema.String)),
  assignees: Schema.optional(Schema.Array(Schema.String)),
  milestone: Schema.optional(Schema.NullOr(Schema.String)),
})

export type IssueProps = Schema.Schema.Type<typeof IssuePropsSchema>

// Output Schema (attributes)
export const IssueOutputSchema = Schema.Struct({
  number: Schema.Number,
  url: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  state: Schema.Literal("open", "closed"),
})

export type IssueOutput = Schema.Schema.Type<typeof IssueOutputSchema>

// Resource Type
export type Issue = Resource<
  "GitHub.Issue",
  IssueProps,
  IssueOutput
>

// Resource Constructor
export const Issue = Resource<Issue>("GitHub.Issue")
```

### GitHub Label Resource

```typescript
// src/alchemy/resources/label.ts
import { Schema } from "effect"
import { Resource } from "alchemy"

export const LabelPropsSchema = Schema.Struct({
  name: Schema.String,
  color: Schema.String.pipe(
    Schema.pattern(/^[0-9a-fA-F]{6}$/),
  ),
  description: Schema.optional(Schema.String),
})

export type LabelProps = Schema.Schema.Type<typeof LabelPropsSchema>

export const LabelOutputSchema = Schema.Struct({
  name: Schema.String,
  color: Schema.String,
  url: Schema.String,
})

export type LabelOutput = Schema.Schema.Type<typeof LabelOutputSchema>

export type Label = Resource<
  "GitHub.Label",
  LabelProps,
  LabelOutput
>

export const Label = Resource<Label>("GitHub.Label")
```

### GitHub Pull Resource

```typescript
// src/alchemy/resources/pull.ts
import { Schema } from "effect"
import { Resource } from "alchemy"

export const PullPropsSchema = Schema.Struct({
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  body: Schema.optional(Schema.String),
  base: Schema.String,
  head: Schema.String,
  draft: Schema.optional(Schema.Boolean),
  labels: Schema.optional(Schema.Array(Schema.String)),
  assignees: Schema.optional(Schema.Array(Schema.String)),
  reviewers: Schema.optional(Schema.Array(Schema.String)),
  milestone: Schema.optional(Schema.NullOr(Schema.String)),
})

export type PullProps = Schema.Schema.Type<typeof PullPropsSchema>

export const PullOutputSchema = Schema.Struct({
  number: Schema.Number,
  url: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  state: Schema.Literal("open", "closed"),
  merged: Schema.optional(Schema.Boolean),
  mergeable: Schema.optional(Schema.Boolean),
})

export type PullOutput = Schema.Schema.Type<typeof PullOutputSchema>

export type Pull = Resource<
  "GitHub.Pull",
  PullProps,
  PullOutput
>

export const Pull = Resource<Pull>("GitHub.Pull")
```

### GitHub Milestone Resource

```typescript
// src/alchemy/resources/milestone.ts
import { Schema } from "effect"
import { Resource } from "alchemy"

export const MilestonePropsSchema = Schema.Struct({
  title: Schema.String,
  state: Schema.Literal("open", "closed"),
  description: Schema.optional(Schema.String),
  due_on: Schema.optional(Schema.String), // ISO 8601
})

export type MilestoneProps = Schema.Schema.Type<typeof MilestonePropsSchema>

export const MilestoneOutputSchema = Schema.Struct({
  number: Schema.Number,
  title: Schema.String,
  url: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  state: Schema.Literal("open", "closed"),
})

export type MilestoneOutput = Schema.Schema.Type<typeof MilestoneOutputSchema>

export type Milestone = Resource<
  "GitHub.Milestone",
  MilestoneProps,
  MilestoneOutput
>

export const Milestone = Resource<Milestone>("GitHub.Milestone")
```

## GitHub Provider Implementation

```typescript
// src/alchemy/providers/github/index.ts
import { Context, Effect, Layer } from "effect"
import { Provider } from "alchemy"
import { Octokit } from "octokit"
import { Issue, Label, Milestone, Pull } from "../../resources"
import { createIssueProvider } from "./issue"
import { createLabelProvider } from "./label"
import { createMilestoneProvider } from "./milestone"
import { createPullProvider } from "./pull"

export class GitHubConfig extends Context.Tag("GitHub.Config")<
  GitHubConfig,
  {
    repo: string
    token: string
  }
>() {}

export class GitHubClient extends Context.Tag("GitHub.Client")<
  GitHubClient,
  Octokit
>() {}

const GitHubClientLive = Layer.effect(
  GitHubClient,
  Effect.gen(function* () {
    const config = yield* GitHubConfig
    return new Octokit({ auth: config.token })
  }),
)

export const providers = () =>
  Layer.mergeAll(
    GitHubClientLive,
    createIssueProvider(),
    createLabelProvider(),
    createMilestoneProvider(),
    createPullProvider(),
  )
```

### Issue Provider

```typescript
// src/alchemy/providers/github/issue.ts
import { Effect, Layer } from "effect"
import { Provider } from "alchemy"
import { Issue, type IssueOutput, type IssueProps } from "../../resources/issue"
import { GitHubClient, GitHubConfig } from "./index"

export function createIssueProvider() {
  return Provider.succeed(Issue, {
    reconcile: Effect.gen(function* ({ news }) {
      const client = yield* GitHubClient
      const config = yield* GitHubConfig
      const [owner, repo] = config.repo.split("/")
      
      const number = Number.parseInt(news.id as string, 10)
      const desired = news.props as IssueProps

      // Try to fetch existing issue
      let existing: IssueOutput | null = null
      try {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.get({ owner, repo, issue_number: number })
        )
        existing = {
          number: data.number,
          url: data.html_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
          state: data.state as "open" | "closed",
        }
      } catch {
        // Issue doesn't exist yet
      }

      // Create new issue
      if (!existing) {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.create({
            owner,
            repo,
            title: desired.title,
            body: desired.body,
            labels: desired.labels,
            assignees: desired.assignees,
            milestone: desired.milestone ? yield* resolveMilestone(desired.milestone) : undefined,
          })
        )
        
        return {
          number: data.number,
          url: data.html_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
          state: data.state as "open" | "closed",
        }
      }

      // Update existing issue
      const updates: any = {}
      if (desired.title !== existing.title) updates.title = desired.title
      if (desired.state !== existing.state) updates.state = desired.state
      if (desired.body !== undefined) updates.body = desired.body
      if (desired.labels !== undefined) updates.labels = desired.labels
      if (desired.assignees !== undefined) updates.assignees = desired.assignees
      
      if (Object.keys(updates).length > 0) {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.update({
            owner,
            repo,
            issue_number: number,
            ...updates,
          })
        )
        
        return {
          number: data.number,
          url: data.html_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
          state: data.state as "open" | "closed",
        }
      }

      return existing
    }),

    delete: Effect.gen(function* ({ olds }) {
      // GitHub doesn't support deleting issues
      // Instead, close and label as "wontfix" or similar
      const client = yield* GitHubClient
      const config = yield* GitHubConfig
      const [owner, repo] = config.repo.split("/")
      
      const number = Number.parseInt(olds.id as string, 10)
      
      yield* Effect.tryPromise(() =>
        client.rest.issues.update({
          owner,
          repo,
          issue_number: number,
          state: "closed",
          state_reason: "not_planned",
        })
      )
    }),

    read: Effect.gen(function* ({ id }) {
      const client = yield* GitHubClient
      const config = yield* GitHubConfig
      const [owner, repo] = config.repo.split("/")
      
      const number = Number.parseInt(id as string, 10)
      
      try {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.get({ owner, repo, issue_number: number })
        )
        
        return {
          number: data.number,
          url: data.html_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
          state: data.state as "open" | "closed",
        }
      } catch {
        return null
      }
    }),
  })
}

function resolveMilestone(title: string) {
  // TODO: Look up milestone number by title
  return Effect.succeed(undefined)
}
```

### Label Provider

```typescript
// src/alchemy/providers/github/label.ts
import { Effect } from "effect"
import { Provider } from "alchemy"
import { Label, type LabelOutput, type LabelProps } from "../../resources/label"
import { GitHubClient, GitHubConfig } from "./index"

export function createLabelProvider() {
  return Provider.succeed(Label, {
    reconcile: Effect.gen(function* ({ news }) {
      const client = yield* GitHubClient
      const config = yield* GitHubConfig
      const [owner, repo] = config.repo.split("/")
      
      const name = news.id as string
      const desired = news.props as LabelProps

      // Try to fetch existing label
      let existing: LabelOutput | null = null
      try {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.getLabel({ owner, repo, name })
        )
        existing = {
          name: data.name,
          color: data.color,
          url: data.url,
        }
      } catch {
        // Label doesn't exist
      }

      // Create new label
      if (!existing) {
        const { data } = yield* Effect.tryPromise(() =>
          client.rest.issues.createLabel({
            owner,
            repo,
            name: desired.name,
            color: desired.color,
            description: desired.description,
          })
        )
        
        return {
          name: data.name,
          color: data.color,
          url: data.url,
        }
      }

      // Update existing label
      const { data } = yield* Effect.tryPromise(() =>
        client.rest.issues.updateLabel({
          owner,
          repo,
          name,
          new_name: desired.name,
          color: desired.color,
          description: desired.description,
        })
      )
      
      return {
        name: data.name,
        color: data.color,
        url: data.url,
      }
    }),

    delete: Effect.gen(function* ({ olds }) {
      const client = yield* GitHubClient
      const config = yield* GitHubConfig
      const [owner, repo] = config.repo.split("/")
      
      const name = olds.id as string
      
      yield* Effect.tryPromise(() =>
        client.rest.issues.deleteLabel({ owner, repo, name })
      )
    }),
  })
}
```

## Stack Declaration (ghfs.run.ts)

```typescript
// ghfs.run.ts
import { Effect } from "effect"
import { Alchemy } from "alchemy"
import * as GitHub from "./src/alchemy/providers/github"
import { Issue, Label, Milestone } from "./src/alchemy/resources"

export default Alchemy.Stack(
  "ghfs",
  {
    providers: GitHub.providers(),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    // Declare labels
    const bugLabel = yield* Label("bug", {
      name: "bug",
      color: "d73a4a",
      description: "Something isn't working",
    })

    const featureLabel = yield* Label("feature", {
      name: "feature",
      color: "a2eeef",
      description: "New feature or request",
    })

    // Declare milestone
    const v1Milestone = yield* Milestone("v1.0", {
      title: "v1.0",
      state: "open",
      description: "First major release",
      due_on: "2026-12-31T00:00:00Z",
    })

    // Declare issues
    const issue123 = yield* Issue("123", {
      title: "Implement feature X",
      state: "open",
      labels: ["feature"],
      milestone: "v1.0",
      body: "Feature X description...",
    })

    return {
      labels: [bugLabel.name, featureLabel.name],
      milestone: v1Milestone.title,
      issue: issue123.number,
    }
  }),
)
```

## CLI Integration

### Update ghfs status

```typescript
// src/cli/commands/status.ts (enhanced)
import { Effect } from "effect"
import { execSync } from "node:child_process"

export function registerStatusCommand(cli: CAC): void {
  cli
    .command("status", "Show local sync status and desired-state drift")
    .action(withErrorHandling(async () => {
      const printer = createCliPrinter("status")
      
      // Show observed state (existing functionality)
      printer.start("Reading local sync state")
      const config = await resolveConfig()
      const summary = await getStatusSummary(config)
      printer.table("Observed State", [
        ["repo", summary.repo ?? "(not resolved yet)"],
        ["last sync", summary.lastSyncedAt],
        ["tracked items", summary.totalTracked],
        ["open items", summary.openCount],
        ["closed items", summary.closedCount],
      ])
      
      // Check for ghfs.run.ts
      if (await pathExists("ghfs.run.ts")) {
        printer.info("Checking desired state drift...")
        
        // Delegate to alchemy plan
        try {
          const planOutput = execSync("npx alchemy plan --no-prompt", {
            encoding: "utf-8",
            cwd: process.cwd(),
          })
          
          printer.print(planOutput)
        } catch (error) {
          printer.warn("Failed to check desired state. Run 'alchemy plan' manually.")
        }
      } else {
        printer.info("No ghfs.run.ts found. Desired-state management not configured.")
        printer.info("Run 'ghfs init-alchemy' to set up alchemy.run integration.")
      }
      
      printer.done("")
    }))
}
```

### Update ghfs apply

```typescript
// src/cli/commands/apply.ts (new command)
import { execSync } from "node:child_process"

export function registerApplyCommand(cli: CAC): void {
  cli
    .command("apply", "Apply desired state changes via alchemy")
    .option("--target <resource>", "Target specific resource")
    .option("--auto-approve", "Skip confirmation prompt")
    .action(withErrorHandling(async (options) => {
      const printer = createCliPrinter("apply")
      
      if (!await pathExists("ghfs.run.ts")) {
        throw new Error("No ghfs.run.ts found. Run 'ghfs init-alchemy' first.")
      }
      
      printer.start("Applying desired state changes...")
      
      const args = ["alchemy", "deploy"]
      if (options.autoApprove) args.push("--auto-approve")
      if (options.target) args.push("--target", options.target)
      
      try {
        const output = execSync(args.join(" "), {
          encoding: "utf-8",
          cwd: process.cwd(),
          stdio: "inherit",
        })
        
        printer.success("Apply complete!")
      } catch (error) {
        printer.error("Apply failed. See output above.")
        process.exit(1)
      }
    }))
}
```

### Add ghfs init-alchemy

```typescript
// src/cli/commands/init-alchemy.ts (new command)
import { writeFile } from "node:fs/promises"

export function registerInitAlchemyCommand(cli: CAC): void {
  cli
    .command("init-alchemy", "Initialize alchemy.run integration")
    .action(withErrorHandling(async () => {
      const printer = createCliPrinter("init-alchemy")
      
      if (await pathExists("ghfs.run.ts")) {
        printer.warn("ghfs.run.ts already exists.")
        return
      }
      
      printer.start("Setting up alchemy.run integration...")
      
      // Install dependencies
      printer.info("Installing effect@rc and alchemy...")
      execSync("npm install effect@rc @effect/platform@rc alchemy@^2.0.0", {
        stdio: "inherit",
      })
      
      // Create ghfs.run.ts template
      const template = `import { Effect } from "effect"
import { Alchemy } from "alchemy"
import * as GitHub from "./src/alchemy/providers/github"

export default Alchemy.Stack(
  "ghfs",
  {
    providers: GitHub.providers(),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    // TODO: Declare your resources here
    // Example:
    // const label = yield* GitHub.Label("bug", {
    //   name: "bug",
    //   color: "d73a4a",
    //   description: "Something isn't working",
    // })
    
    return {}
  }),
)
`
      
      await writeFile("ghfs.run.ts", template)
      printer.success("Created ghfs.run.ts")
      
      printer.info("Next steps:")
      printer.info("  1. Edit ghfs.run.ts to declare desired resources")
      printer.info("  2. Run 'ghfs status' to see drift")
      printer.info("  3. Run 'ghfs apply' to apply changes")
      
      printer.done("")
    }))
}
```

## Resource File Format (Alternative)

Instead of TypeScript Stack files, support YAML resource declarations that get loaded into the Stack:

```yaml
# .ghfs/_desired/labels/bug.yml
schema: ghfs/v1/Label
id: bug
props:
  name: bug
  color: d73a4a
  description: "Something isn't working"
```

```typescript
// src/alchemy/load-yaml-resources.ts
import { Effect, Schema } from "effect"
import { readdir, readFile } from "@effect/platform/FileSystem"
import YAML from "yaml"
import { Label, Issue, Milestone, Pull } from "./resources"

export function loadYamlResources(desiredDir: string) {
  return Effect.gen(function* () {
    const fs = yield* readdir
    
    // Load label resources
    const labelFiles = yield* fs.readdir(`${desiredDir}/labels`)
    const labels = []
    for (const file of labelFiles) {
      if (!file.endsWith(".yml")) continue
      const content = yield* fs.readFile(`${desiredDir}/labels/${file}`)
      const parsed = YAML.parse(content.toString())
      
      if (parsed.schema === "ghfs/v1/Label") {
        labels.push(
          yield* Label(parsed.id, Schema.decodeUnknown(LabelPropsSchema)(parsed.props))
        )
      }
    }
    
    // Similar for issues, pulls, milestones...
    
    return { labels }
  })
}
```

## Migration Path

1. **Phase 1**: Install Effect + alchemy dependencies
2. **Phase 2**: Implement GitHub resource types (Issue, Label, Milestone, Pull)
3. **Phase 3**: Implement GitHub provider with reconcile/delete
4. **Phase 4**: Create `ghfs.run.ts` template
5. **Phase 5**: Update CLI commands (`status`, `apply`, `init-alchemy`)
6. **Phase 6**: Optional: YAML resource file loader
7. **Phase 7**: Documentation and examples

## Benefits of This Approach

1. **Leverage alchemy infrastructure**: No need to rebuild plan/apply/state management
2. **Effect-native**: Uses Effect v4 RC patterns throughout
3. **Type-safe**: Effect Schema validates all inputs/outputs
4. **Composable**: Layers make it easy to test and extend
5. **Standards-aligned**: Same patterns as alchemy.run cloud resources
6. **Platform-agnostic**: Uses `@effect/platform` instead of Node APIs directly

## Next Steps

1. Install dependencies (`effect@rc`, `@effect/platform@rc`, `alchemy`)
2. Create resource type definitions
3. Implement GitHub provider Layer
4. Create `ghfs.run.ts` template
5. Update CLI to delegate to alchemy
6. Write tests
7. Document integration
