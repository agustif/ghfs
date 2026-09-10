export interface GhfsUserConfig {
  /**
   * The repository to sync.
   *
   * Will try to detect the repository from the current working directory or the `package.json` file.
   */
  repo?: string
  /**
   * The directory to store the synced issues and pull requests.
   *
   * @default '.ghfs'
   */
  directory?: string
  /**
   * The authentication configuration.
   */
  auth?: {
    /**
     * The GitHub personal access token to use for authentication.
     *
     * When not provided, will try to get the token from `gh auth token` or the environment variables `GH_TOKEN` or `GITHUB_TOKEN`.
     */
    token?: string
  }
  /**
   * Additional bot logins to ignore when computing the "last updated"
   * sort order for issues and pull requests. Logins ending with `[bot]`
   * (e.g. `dependabot[bot]`) are always detected automatically; use this
   * list for non-suffix bots like `coderabbitai`. Case-insensitive.
   *
   * @default []
   */
  bots?: string[]
  sync?: {
    /**
     * Whether to sync issues.
     *
     * @default true
     */
    issues?: boolean
    /**
     * Whether to sync pull requests.
     *
     * @default true
     */
    pulls?: boolean
    /**
     * Whether to sync discussions.
     *
     * @default true
     */
    discussions?: boolean
    /**
     * Whether to sync wiki pages.
     *
     * @default true
     */
    wiki?: boolean
    /**
     * Whether to sync merge queue entries.
     *
     * @default true
     */
    mergeQueue?: boolean
    /**
     * Whether to sync releases and tags.
     *
     * @default true
     */
    releases?: boolean
    /**
     * Whether to sync recent workflow runs for open PRs.
     *
     * @default true
     */
    workflows?: boolean
    /**
     * Whether to sync repository metadata (topics, features, CODEOWNERS, security advisories).
     *
     * @default true
     */
    metadata?: boolean
    /**
     * When to sync closed issues and pull requests.
     *
     * - `true`: sync all closed issues and pull requests.
     * - `false`: don't sync any closed issues and pull requests. And delete any existing closed issues and pull requests from the local filesystem.
     *
     * @default false
     */
    closed?: boolean
    /**
     * When to download the pull request patch files.
     *
     * - `'open'`: only download open pull request patch files.
     * - `'all'`: download all pull request patch files.
     * - `false`: don't download any pull request patch files.
     *
     * @default 'open'
     */
    patches?: 'open' | 'all' | false
  }
  /**
   * Search coverage configuration for agent ergonomics.
   */
  search?: {
    /**
     * Whether to search code for TODO/FIXME comments and save to .ghfs/search/code-todos.jsonl
    /**
     * Whether to sync GitHub Actions workflows, runs, and artifacts.
     *
     * @default false
     */
    actions?: boolean
    /**
     * Number of workflow runs to fetch per workflow.
     *
     * @default 30
     */
    codeTodos?: boolean
    /**
     * Whether to search commits for "fixes #" references and save to .ghfs/search/commit-refs.jsonl
     *
     * @default true
     */
    commitRefs?: boolean
    /**
     * Optional saved issue searches to run. Each query is saved to .ghfs/search/issues-<key>.jsonl
     *
     * @example
     * {
     *   'p1-bugs': 'is:issue is:open label:bug label:p1',
     *   'needs-triage': 'is:issue is:open no:label'
     * }
     *
     * @default {}
     */
    issueQueries?: Record<string, string>
    /**
     * Whether to search for mentions of the repository name in other issues (heavy operation)
     *
     * @default false
     */
    mentions?: boolean
    /**
     * Maximum number of search results per query to avoid rate limits
     *
     * @default 100
     */
    maxResults?: number
    syncState?: boolean
      /**
       * Whether to sync PR compare data: ahead/behind commits, merge-base (compare.json).
       *
       * @default true
       */
      compare?: boolean
      /**
       * Whether to sync PR stack relationships: base and dependent PRs (stack.json).
       *
       * @default true
       */
      stack?: boolean
      /**
       * Whether to use GraphQL statusCheckRollup for check status (more comprehensive).
       * When true, check status is fetched via GraphQL; when false, uses REST API.
       *
       * @default true
       */
      statusCheckRollup?: boolean
    }
  }
  /**
   * Extended metadata generation for agent ergonomics.
   */
  extended?: {
    /**
     * Generate activity.md with last N repository events.
     *
     * @default true
     */
    activity?: boolean
    /**
     * Generate agent-hints.md with detected test/lint/build commands.
     *
     * @default true
     */
    agentHints?: boolean
    /**
     * Generate deployments/ with environment and deployment status.
     * Gracefully skips if deployments unavailable.
     *
     * @default true
     */
    deployments?: boolean
     * Whether to sync custom repository properties.
     *
     * @default false
     */
    customProperties?: boolean
    /**
     * Whether to sync autolink references.
     *
     * @default false
     */
    autolinks?: boolean
    /**
     * Whether to sync commit activity stats.
     *
     * @default false
     */
    commitActivity?: boolean
    /**
     * Whether to sync participation stats.
     *
     * @default false
     */
    participationStats?: boolean
    /**
     * Whether to sync repository tags.
     *
     * @default false
     */
    tags?: boolean
    /**
     * Whether to sync git refs.
     *
     * @default false
     */
    gitRefs?: boolean
    /**
     * Whether to sync docs tree (recursive tree of docs/ directory).
     *
     * @default false
     */
    docsTree?: boolean
    /**
     * Whether to sync assignee suggestions.
     *
     * @default false
     */
    assigneeSuggestions?: boolean
    /**
     * Whether to sync traffic data (referrers, paths, views, clones).
     *
     * @default false
     */
    traffic?: boolean
    /**
     * Whether to sync private vulnerability reporting status.
     *
     * @default false
     */
    vulnerabilityReporting?: boolean
    actionsRunsPerWorkflow?: number
  }
}

export type GhfsResolvedConfig = Required<GhfsUserConfig> & {
  cwd: string
  auth: Required<GhfsUserConfig['auth']>
  sync: Required<GhfsUserConfig['sync']>
  search: Required<Omit<NonNullable<GhfsUserConfig['search']>, 'issueQueries'>> & {
    issueQueries: Record<string, string>
  }
}
