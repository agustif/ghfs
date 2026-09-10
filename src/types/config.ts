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
    /**
     * GitHub Actions workflow logs sync configuration.
     *
     * - `false`: don't sync Actions logs.
     * - `'failed'`: sync logs only for failed workflow jobs.
     * - `'recent'`: sync logs for all jobs from recent workflow runs.
     * - `'full'`: download full logs (default tail strategy: last N KB).
     * - `'tail'`: download only the tail of logs (last N KB).
     *
     * @default false
     */
    actionsLogs?: false | 'failed' | 'recent'
    /**
     * Maximum size (in KB) for individual Actions log files.
     * When a log exceeds this size, only the tail is stored.
     *
     * @default 512
     */
    actionsLogsMaxKb?: number
    /**
     * Maximum number of workflow runs to sync.
     * Limits the number of workflow runs fetched from the API.
     *
     * @default 100
     */
    actionsRunsLimit?: number
    /**
     * GitHub Actions artifacts sync configuration.
     *
     * - `false`: don't sync artifacts metadata.
     * - `true`: sync artifacts metadata (list only, no downloads).
     *
     * @default false
     */
    actionsArtifacts?: boolean
    /**
     * Webhooks sync configuration.
     *
     * - `false`: don't sync webhooks.
     * - `true`: sync webhook configurations and recent deliveries.
     *
     * @default false
     */
    webhooks?: boolean
    /**
     * Maximum number of webhook deliveries to sync per webhook.
     *
     * @default 50
     */
    webhooksMaxDeliveries?: number
  }
}

export type GhfsResolvedConfig = Required<GhfsUserConfig> & {
  cwd: string
  auth: Required<GhfsUserConfig['auth']>
  sync: Required<GhfsUserConfig['sync']>
}
