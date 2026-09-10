import type { Lock, LockStatus } from '../types/coordination'

// TODO: Implement local coordination - https://github.com/agustif/ghfs/issues/22
// .ghfs/locks/ and .ghfs/notes/ for agent swarm coordination

export async function claimLock(
  storageDir: string,
  itemType: 'pr' | 'issue',
  number: number,
  agent: string,
  task: string,
  timeoutMinutes: number = 30,
): Promise<boolean> {
  // TODO: Check if lock exists/expired, create lock file
  return false
}

export async function releaseLock(
  storageDir: string,
  itemType: 'pr' | 'issue',
  number: number,
): Promise<void> {
  // TODO: Delete lock file
}

export async function checkLock(
  storageDir: string,
  itemType: 'pr' | 'issue',
  number: number,
): Promise<LockStatus> {
  // TODO: Check lock status and expiry
  return { locked: false, expired: false }
}

export async function listLocks(storageDir: string): Promise<Array<{ file: string, lock: Lock }>> {
  // TODO: List all active locks
  return []
}

export async function writeNote(
  storageDir: string,
  itemType: 'pr' | 'issue',
  number: number,
  content: string,
): Promise<void> {
  // TODO: Append to .ghfs/notes/{type}-{number}.md
}

export async function readNote(
  storageDir: string,
  itemType: 'pr' | 'issue',
  number: number,
): Promise<string | null> {
  // TODO: Read .ghfs/notes/{type}-{number}.md
  return null
}
