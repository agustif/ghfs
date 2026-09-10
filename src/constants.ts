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
export const ACTIONS_DIR_NAME = 'actions'
export const SYNC_STATE_FILE_NAME = '.sync.json'
export const ISSUES_INDEX_FILE_NAME = 'issues.md'
export const PULLS_INDEX_FILE_NAME = 'pulls.md'
export const REPO_SNAPSHOT_FILE_NAME = 'repo.json'
export const ACTIONS_INDEX_FILE_NAME = 'workflows.md'
export const EXECUTE_FILE_NAME = 'execute.yml'
export const EXECUTE_MD_FILE_NAME = 'execute.md'
export const EXECUTE_SCHEMA_RELATIVE_PATH = 'schema/execute.schema.json'

// Foundation intelligence layer
export const EXTENDED_GRAPH_FILE_NAME = 'graph.jsonl'
export const PROVENANCE_FILE_NAME = 'provenance.jsonl'
export const INDEX_FILE_NAME = 'INDEX.md'
export const PACKS_DIR_NAME = 'packs'
export const LOCKS_DIR_NAME = 'locks'
export const NOTES_DIR_NAME = 'notes'
