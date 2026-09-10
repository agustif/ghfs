import type { Lock, LockStatus } from '../types/coordination'

// TODO: Implement local coordination - https://github.com/agustif/ghfs/issues/22
// .ghfs/locks/ and .ghfs/notes/ for agent swarm coordination

export async function claimLock(
  _storageDir: string,
  _itemType: 'pr' | 'issue',
  _number: number,
  agent: string,
  task: string,
  _timeoutMinutes: number = 30,
): Promise<boolean> {
  // TODO: Check if lock exists/expired, create lock file
  return false
}

export async function releaseLock(
  _storageDir: string,
  _itemType: 'pr' | 'issue',
  _number: number,
): Promise<void> {
  // TODO: Delete lock file
}

export async function checkLock(
  _storageDir: string,
  _itemType: 'pr' | 'issue',
  _number: number,
): Promise<LockStatus> {
  // TODO: Check lock status and expiry
  return { locked: false, expired: false }
}

export async function listLocks(_storageDir: string): Promise<Array<{ file: string, lock: Lock }>> {
  // TODO: List all active locks
  return []
}

export async function writeNote(
  _storageDir: string,
  _itemType: 'pr' | 'issue',
  _number: number,
  _content: string,
): Promise<void> {
  // TODO: Append to .ghfs/notes/{type}-{number}.md
}

export async function readNote(
  _storageDir: string,
  _itemType: 'pr' | 'issue',
  _number: number,
): Promise<string | null> {
  // TODO: Read .ghfs/notes/{type}-{number}.md
  return null
}
