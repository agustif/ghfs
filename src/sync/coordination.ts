import { resolve } from 'pathe'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

export interface Lock {
  agent: string
  claimed_at: string
  task: string
  expires_at: string
}

export function claimLock(
  storageDirAbsolute: string,
  itemType: 'pr' | 'issue',
  number: number,
  agent: string,
  task: string,
  ttlMs: number = 3600000,
): boolean {
  const locksDir = resolve(storageDirAbsolute, 'locks')
  mkdirSync(locksDir, { recursive: true })

  const lockPath = resolve(locksDir, `${itemType}-${number}.lock`)

  if (existsSync(lockPath)) {
    const existingLock: Lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
    const expiresAt = new Date(existingLock.expires_at)
    if (expiresAt > new Date()) {
      return false
    }
  }

  const lock: Lock = {
    agent,
    claimed_at: new Date().toISOString(),
    task,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  }

  writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8')
  return true
}

export function releaseLock(
  storageDirAbsolute: string,
  itemType: 'pr' | 'issue',
  number: number,
): boolean {
  const lockPath = resolve(storageDirAbsolute, 'locks', `${itemType}-${number}.lock`)
  if (existsSync(lockPath)) {
    rmSync(lockPath)
    return true
  }
  return false
}

export function checkLock(
  storageDirAbsolute: string,
  itemType: 'pr' | 'issue',
  number: number,
): Lock | null {
  const lockPath = resolve(storageDirAbsolute, 'locks', `${itemType}-${number}.lock`)
  if (!existsSync(lockPath)) {
    return null
  }

  const lock: Lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
  const expiresAt = new Date(lock.expires_at)
  if (expiresAt <= new Date()) {
    rmSync(lockPath)
    return null
  }

  return lock
}

export function appendNote(
  storageDirAbsolute: string,
  itemType: 'pr' | 'issue',
  number: number,
  note: string,
): void {
  const notesDir = resolve(storageDirAbsolute, 'notes')
  mkdirSync(notesDir, { recursive: true })

  const notePath = resolve(notesDir, `${itemType}-${number}.md`)
  const timestamp = new Date().toISOString()
  const entry = `\n## ${timestamp}\n\n${note}\n`

  if (existsSync(notePath)) {
    writeFileSync(notePath, readFileSync(notePath, 'utf-8') + entry, 'utf-8')
  }
  else {
    writeFileSync(notePath, `# Notes: ${itemType} #${number}${entry}`, 'utf-8')
  }
}

export function readNote(
  storageDirAbsolute: string,
  itemType: 'pr' | 'issue',
  number: number,
): string | null {
  const notePath = resolve(storageDirAbsolute, 'notes', `${itemType}-${number}.md`)
  if (!existsSync(notePath)) {
    return null
  }
  return readFileSync(notePath, 'utf-8')
}
