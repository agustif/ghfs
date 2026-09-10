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
export const PEOPLE_DIR_NAME = 'people'
export const SYNC_STATE_FILE_NAME = '.sync.json'
export const ISSUES_INDEX_FILE_NAME = 'issues.md'
export const PULLS_INDEX_FILE_NAME = 'pulls.md'
export const REPO_SNAPSHOT_FILE_NAME = 'repo.json'
export const COLLABORATORS_FILE_NAME = 'collaborators.json'
export const TEAMS_FILE_NAME = 'teams.json'
export const INVITATIONS_FILE_NAME = 'invitations.json'
export const ASSIGNABLE_USERS_FILE_NAME = 'assignable-users.json'
export const CONTRIBUTORS_FILE_NAME = 'contributors.json'
export const RULESETS_FILE_NAME = 'rulesets.json'
export const BRANCH_PROTECTION_FILE_NAME = 'branch-protection.json'
export const CODEOWNERS_ERRORS_FILE_NAME = 'codeowners-errors.json'
export const COMMIT_ACTIVITY_FILE_NAME = 'commit-activity.json'
export const CODE_FREQUENCY_FILE_NAME = 'code-frequency.json'
export const PARTICIPATION_FILE_NAME = 'participation.json'
export const PUNCH_CARD_FILE_NAME = 'punch-card.json'
export const EXECUTE_FILE_NAME = 'execute.yml'
export const EXECUTE_MD_FILE_NAME = 'execute.md'
export const EXECUTE_SCHEMA_RELATIVE_PATH = 'schema/execute.schema.json'
