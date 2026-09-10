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
     * Whether to sync repository metadata surfaces.
     *
     * @default true
     */
    metadata?: {
      /**
       * Whether to sync participating notifications.
       *
       * @default true
       */
      notifications?: boolean
      /**
       * Whether to sync rate limit information.
       *
       * @default true
       */
      rateLimit?: boolean
      /**
       * Whether to sync authenticated user permissions.
       *
       * @default true
       */
      permissions?: boolean
      /**
       * Whether to sync community profile.
       *
       * @default true
       */
      communityProfile?: boolean
      /**
       * Whether to sync interaction limits.
       *
       * @default true
       */
      interactionLimits?: boolean
      /**
       * Whether to sync custom properties.
       *
       * @default true
       */
      customProperties?: boolean
      /**
       * Whether to sync topics.
       *
       * @default true
       */
      topics?: boolean
      /**
       * Whether to sync environments.
       *
       * @default true
       */
      environments?: boolean
      /**
       * Whether to sync deploy keys metadata.
       *
       * @default true
       */
      deployKeys?: boolean
      /**
       * Whether to sync actions caches.
       *
       * @default true
       */
      actionsCaches?: boolean
      /**
       * Whether to sync pages builds history.
       *
       * @default true
       */
      pagesBuilds?: boolean
      /**
       * Whether to sync tag protection rules.
       *
       * @default true
       */
      tagProtection?: boolean
      /**
       * Whether to sync autolinks.
       *
       * @default true
       */
      autolinks?: boolean
    }
  }
}

export type GhfsResolvedConfig = Required<GhfsUserConfig> & {
  cwd: string
  auth: Required<GhfsUserConfig['auth']>
  sync: Required<GhfsUserConfig['sync']> & {
    metadata: Required<NonNullable<GhfsUserConfig['sync']>['metadata']>
  }
}
