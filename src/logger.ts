import type { Diagnostic } from 'nostics'
import process from 'node:process'
import { diagnostics as baseDiagnostics } from './diagnostics'

type SoftDiagnostics = typeof baseDiagnostics & {
  warn: (message: string) => void
  debug: (message: string) => void
  info: (message: string) => void
}

export const diagnostics: SoftDiagnostics = Object.assign(baseDiagnostics, {
  warn: (message: string) => {
    console.warn(message)
  },
  debug: (message: string) => {
    if (process.env.DEBUG || process.env.GHFS_DEBUG)
      console.warn(`[ghfs:debug] ${message}`)
  },
  info: (message: string) => {
    console.warn(`[ghfs:info] ${message}`)
  },
})

export function formatInline(d: Diagnostic): string {
  return `[${d.name}] ${d.message}`
}
