export interface Lock {
  agent: string
  claimed_at: string
  task: string
  timeout_at?: string
}

export interface LockStatus {
  locked: boolean
  lock?: Lock
  expired: boolean
}
