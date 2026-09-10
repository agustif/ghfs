export const CONFIG_FILE_CANDIDATES = [
  'ghfs.config.ts',
  'ghfs.config.mts',
  'ghfs.config.mjs',
  'ghfs.config.js',
  'ghfs.config.cjs',
] as const

export const DEFAULT_STORAGE_DIR = '.ghfs'

export const ISSUE_DIR_NAME = 'issues'
export const PULL_DIR_NAME = 'pulls'
export const CLOSED_DIR_NAME = 'closed'
export const BILLING_DIR_NAME = 'billing'
export const PACKAGES_DIR_NAME = 'packages'
export const CODESPACES_DIR_NAME = 'codespaces'
export const SECURITY_DIR_NAME = 'security'
export const SECRET_SCANNING_DIR_NAME = 'secret-scanning'
export const DEPENDABOT_DIR_NAME = 'dependabot'
export const CODE_SCANNING_DIR_NAME = 'code-scanning'
export const SYNC_STATE_FILE_NAME = '.sync.json'
export const ISSUES_INDEX_FILE_NAME = 'issues.md'
export const PULLS_INDEX_FILE_NAME = 'pulls.md'
export const REPO_SNAPSHOT_FILE_NAME = 'repo.json'
export const BILLING_FILE_NAME = 'usage-summary.json'
export const PACKAGES_FILE_NAME = 'packages.json'
export const CODESPACES_FILE_NAME = 'codespaces.json'
export const SECRET_SCANNING_FILE_NAME = 'alerts.json'
export const DEPENDABOT_FILE_NAME = 'alerts.json'
export const CODE_SCANNING_FILE_NAME = 'alerts.json'
export const EXECUTE_FILE_NAME = 'execute.yml'
export const EXECUTE_MD_FILE_NAME = 'execute.md'
export const EXECUTE_SCHEMA_RELATIVE_PATH = 'schema/execute.schema.json'
