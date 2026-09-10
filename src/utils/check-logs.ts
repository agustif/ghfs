const MAX_HUNK_SIZE = 2000
const MAX_TOTAL_SIZE = 10000
const MAX_HUNKS = 10

const ERROR_PATTERNS = [
  /error:/i,
  /fail(ed|ure):/i,
  /exception:/i,
  /\berror\b/i,
  /\bfailed\b/i,
  /❌/,
  /✗/,
  /\[error\]/i,
  /\[fail\]/i,
  /\bassert(ion)? (error|fail)/i,
  /test.+fail/i,
  /\s+at\s+(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]):\d+:\d+/,
]

const IGNORE_PATTERNS = [
  /npm.+\berror\b/i,
  /downloading/i,
  /installing/i,
]

export function extractErrorHunks(logText: string): string[] {
  if (!logText || logText.length === 0)
    return []

  const lines = logText.split('\n')
  const hunks: string[] = []
  let currentHunk: string[] = []
  let totalSize = 0
  let inErrorContext = false
  let contextLineCount = 0

  for (let i = 0; i < lines.length && hunks.length < MAX_HUNKS && totalSize < MAX_TOTAL_SIZE; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (IGNORE_PATTERNS.some(p => p.test(line)))
      continue

    const isErrorLine = ERROR_PATTERNS.some(p => p.test(line))

    if (isErrorLine) {
      if (!inErrorContext) {
        if (currentHunk.length > 0) {
          const hunkText = currentHunk.join('\n')
          if (hunkText.length <= MAX_HUNK_SIZE) {
            hunks.push(hunkText)
            totalSize += hunkText.length
          }
          currentHunk = []
        }

        const contextStart = Math.max(0, i - 3)
        for (let j = contextStart; j < i; j++)
          currentHunk.push(lines[j])
      }

      currentHunk.push(line)
      inErrorContext = true
      contextLineCount = 0
    }
    else if (inErrorContext) {
      currentHunk.push(line)
      contextLineCount++

      if (contextLineCount >= 5 || trimmed === '' || i === lines.length - 1) {
        const hunkText = currentHunk.join('\n')
        if (hunkText.length <= MAX_HUNK_SIZE) {
          hunks.push(hunkText)
          totalSize += hunkText.length
        }
        currentHunk = []
        inErrorContext = false
      }
    }
  }

  if (currentHunk.length > 0 && totalSize < MAX_TOTAL_SIZE) {
    const hunkText = currentHunk.join('\n')
    if (hunkText.length <= MAX_HUNK_SIZE) {
      hunks.push(hunkText)
      totalSize += hunkText.length
    }
  }

  return hunks.filter(h => h.length > 0)
}
