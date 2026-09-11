/**
 * Effect-native execute.md parser (Schema-first).
 *
 * Copy to: src-effect/domain/execute-md.ts
 * Tip: f8de2f7
 *
 * Pure line parser + Schema.decode through ExecuteOpSchema.
 * No @effect/platform import (keeps domain free of FS). Engine wires
 * FileSystem + parseExecuteMdEffect — see execution-engine-parse-md.md.
 */
import { Effect, Result, Schema } from 'effect'
import { ExecuteError } from './errors'
import { type ExecuteOp, ExecuteOpSchema } from './execute-op'

/** Result of parsing an execute.md document. */
export class ExecuteMdParsed extends Schema.Class<ExecuteMdParsed>('ExecuteMdParsed')({
  ops: Schema.Array(ExecuteOpSchema),
  warnings: Schema.Array(Schema.String),
}) {}

export type ExecuteMdParsedType = Schema.Schema.Type<typeof ExecuteMdParsed>

const MULTI_SIMPLE_ACTIONS = new Set([
  'close',
  'reopen',
  'clear-milestone',
  'unlock',
  'mark-ready-for-review',
  'convert-to-draft',
])

type MultiSimpleAction =
  | 'close'
  | 'reopen'
  | 'clear-milestone'
  | 'unlock'
  | 'mark-ready-for-review'
  | 'convert-to-draft'

/** Canonical action names this parser emits (subset of ExecuteOp). */
const SUPPORTED_ACTIONS = new Set<string>([
  'close',
  'reopen',
  'clear-milestone',
  'unlock',
  'mark-ready-for-review',
  'convert-to-draft',
  'set-title',
  'add-labels',
  'add-assignees',
  'add-comment',
  'close-with-comment',
])

/** Aliases mirroring legacy `src/execute/actions.ts` for supported commands only. */
const ACTION_ALIASES: Record<string, string> = {
  open: 'reopen',
  closes: 'close',
  'close-comment': 'close-with-comment',
  'comment-close': 'close-with-comment',
  'close-and-comment': 'close-with-comment',
  'comment-and-close': 'close-with-comment',
  label: 'add-labels',
  labels: 'add-labels',
  tag: 'add-labels',
  tags: 'add-labels',
  'add-tag': 'add-labels',
  assign: 'add-assignees',
  assignee: 'add-assignees',
  assignees: 'add-assignees',
  title: 'set-title',
  retitle: 'set-title',
  ready: 'mark-ready-for-review',
  undraft: 'mark-ready-for-review',
  draft: 'convert-to-draft',
  comment: 'add-comment',
}

type LineOk = { readonly _tag: 'ops'; readonly ops: ReadonlyArray<unknown> }
type LineSkip = { readonly _tag: 'skip' }
type LineWarn = { readonly _tag: 'warning'; readonly message: string }
type LineResult = LineOk | LineSkip | LineWarn

function resolveActionName(action: string): string | undefined {
  const normalized = action.trim().toLowerCase()
  if (!normalized)
    return undefined
  if (SUPPORTED_ACTIONS.has(normalized))
    return normalized
  const aliased = ACTION_ALIASES[normalized]
  if (aliased && SUPPORTED_ACTIONS.has(aliased))
    return aliased
  return undefined
}

function isCommentLine(trimmed: string): boolean {
  return trimmed.startsWith('#')
    || trimmed.startsWith('//')
    || trimmed.startsWith('<!--')
}

function parseIssueRef(value: string): number | undefined {
  const match = value.match(/^#(\d+)$/)
  if (!match)
    return undefined
  const number = Number.parseInt(match[1]!, 10)
  if (!Number.isInteger(number) || number <= 0)
    return undefined
  return number
}

function tokenizeCommand(value: string): string[] | undefined {
  const tokens: string[] = []
  let index = 0

  while (index < value.length) {
    while (index < value.length && /\s/.test(value[index]!))
      index += 1

    if (index >= value.length)
      break

    if (value[index] === '"') {
      index += 1
      let token = ''
      let closed = false

      while (index < value.length) {
        const char = value[index]!
        if (char === '\\') {
          const next = value[index + 1]
          if (next === '"' || next === '\\') {
            token += next
            index += 2
            continue
          }
        }

        if (char === '"') {
          closed = true
          index += 1
          break
        }

        token += char
        index += 1
      }

      if (!closed)
        return undefined

      tokens.push(token)
      continue
    }

    const start = index
    while (index < value.length && !/\s/.test(value[index]!))
      index += 1

    tokens.push(value.slice(start, index))
  }

  return tokens
}

function decodeOp(candidate: unknown): Result.Result<ExecuteOp, string> {
  const decoded = Schema.decodeUnknownResult(ExecuteOpSchema)(candidate)
  if (Result.isFailure(decoded)) {
    return Result.fail(`Schema.decode failed: ${decoded.failure.message}`)
  }
  return Result.succeed(decoded.success)
}

function parseSetTitle(args: ReadonlyArray<string>): LineResult {
  if (args.length !== 2) {
    return {
      _tag: 'warning',
      message: '[GHFS0152] set-title expects: set-title #<number> "<title>"',
    }
  }
  const number = parseIssueRef(args[0]!)
  if (!number) {
    return {
      _tag: 'warning',
      message: '[GHFS0153] set-title expects a single issue reference (#N)',
    }
  }
  return { _tag: 'ops', ops: [{ action: 'set-title', number, title: args[1]! }] }
}

function parseAddLabels(args: ReadonlyArray<string>, command: string): LineResult {
  if (args.length < 2) {
    return {
      _tag: 'warning',
      message: `[GHFS0152] ${command} expects: ${command} #<number> <label1, label2>`,
    }
  }
  const number = parseIssueRef(args[0]!)
  if (!number) {
    return {
      _tag: 'warning',
      message: `[GHFS0153] ${command} expects a single issue reference (#N)`,
    }
  }
  const labels = args
    .slice(1)
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean)
  if (labels.length === 0) {
    return {
      _tag: 'warning',
      message: `[GHFS0154] ${command} requires at least one label`,
    }
  }
  return { _tag: 'ops', ops: [{ action: 'add-labels', number, labels }] }
}

function parseAddAssignees(args: ReadonlyArray<string>, command: string): LineResult {
  if (args.length < 2) {
    return {
      _tag: 'warning',
      message: `[GHFS0152] ${command} expects: ${command} #<number> <assignee1, assignee2>`,
    }
  }
  const number = parseIssueRef(args[0]!)
  if (!number) {
    return {
      _tag: 'warning',
      message: `[GHFS0153] ${command} expects a single issue reference (#N)`,
    }
  }
  const assignees = args
    .slice(1)
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean)
  if (assignees.length === 0) {
    return {
      _tag: 'warning',
      message: `[GHFS0155] ${command} requires at least one assignee`,
    }
  }
  return { _tag: 'ops', ops: [{ action: 'add-assignees', number, assignees }] }
}

function parseBodyCommand(
  action: 'add-comment' | 'close-with-comment',
  args: ReadonlyArray<string>,
  command: string,
): LineResult {
  if (args.length < 2) {
    return {
      _tag: 'warning',
      message: `[GHFS0152] ${command} expects: ${command} #<number> "<comment>"`,
    }
  }
  const number = parseIssueRef(args[0]!)
  if (!number) {
    return {
      _tag: 'warning',
      message: `[GHFS0153] ${command} expects a single issue reference (#N)`,
    }
  }
  const body = args.slice(1).join(' ').trim()
  if (!body) {
    return {
      _tag: 'warning',
      message: `[GHFS0156] ${command} requires a non-empty comment`,
    }
  }
  return { _tag: 'ops', ops: [{ action, number, body }] }
}

function parseMultiSimpleAction(
  action: MultiSimpleAction,
  args: ReadonlyArray<string>,
  command: string,
): LineResult {
  const numbers = args.map(parseIssueRef)
  if (numbers.length === 0 || numbers.some(number => !number)) {
    return {
      _tag: 'warning',
      message: `[GHFS0157] ${command} expects one or more issue references (#N)`,
    }
  }
  return {
    _tag: 'ops',
    ops: (numbers as number[]).map(number => ({ action, number })),
  }
}

/** Parse a single execute.md command line into raw op candidates or a warning. */
export function parseExecuteMdLine(line: string): LineResult {
  const trimmed = line.trim()
  if (!trimmed || isCommentLine(trimmed))
    return { _tag: 'skip' }

  const tokens = tokenizeCommand(trimmed)
  if (!tokens) {
    return { _tag: 'warning', message: '[GHFS0150] invalid quoted string syntax' }
  }
  if (tokens.length === 0)
    return { _tag: 'skip' }

  const [commandInput, ...args] = tokens
  const command = resolveActionName(commandInput!)
  if (!command) {
    return {
      _tag: 'warning',
      message: `[GHFS0151] unrecognized action pattern: ${commandInput}`,
    }
  }

  if (command === 'set-title')
    return parseSetTitle(args)
  if (command === 'add-labels')
    return parseAddLabels(args, commandInput!)
  if (command === 'add-assignees')
    return parseAddAssignees(args, commandInput!)
  if (command === 'add-comment')
    return parseBodyCommand('add-comment', args, commandInput!)
  if (command === 'close-with-comment')
    return parseBodyCommand('close-with-comment', args, commandInput!)
  if (MULTI_SIMPLE_ACTIONS.has(command)) {
    return parseMultiSimpleAction(command as MultiSimpleAction, args, commandInput!)
  }

  return {
    _tag: 'warning',
    message: `[GHFS0151] unrecognized action pattern: ${commandInput}`,
  }
}

/**
 * Pure sync parser: split lines, skip `#` / `//` / HTML comment blocks,
 * decode each candidate through ExecuteOpSchema.
 */
export function parseExecuteMd(raw: string): ExecuteMdParsed {
  const lines = raw.split(/\r?\n/)
  const ops: ExecuteOp[] = []
  const warnings: string[] = []
  let inHtmlCommentBlock = false

  for (const [lineIndex, rawLine] of lines.entries()) {
    const trimmed = rawLine.trim()

    if (inHtmlCommentBlock) {
      if (trimmed.includes('-->'))
        inHtmlCommentBlock = false
      continue
    }

    if (trimmed.startsWith('<!--')) {
      if (!trimmed.includes('-->'))
        inHtmlCommentBlock = true
      continue
    }

    const parsed = parseExecuteMdLine(rawLine)
    if (parsed._tag === 'skip')
      continue

    if (parsed._tag === 'warning') {
      warnings.push(`execute-md line ${lineIndex + 1}: ${parsed.message}`)
      continue
    }

    for (const candidate of parsed.ops) {
      const decoded = decodeOp(candidate)
      if (Result.isFailure(decoded)) {
        warnings.push(`execute-md line ${lineIndex + 1}: ${decoded.failure}`)
        continue
      }
      ops.push(decoded.success)
    }
  }

  return Schema.decodeUnknownSync(ExecuteMdParsed)({ ops, warnings })
}

/** Effect wrapper — hard-fails with ExecuteError only on unexpected throw. */
export const parseExecuteMdEffect = (
  raw: string,
): Effect.Effect<ExecuteMdParsed, ExecuteError> =>
  Effect.try({
    try: () => parseExecuteMd(raw),
    catch: cause =>
      new ExecuteError({
        message: 'Failed to parse execute.md',
        cause,
      }),
  })

/**
 * Parse raw markdown string; empty / whitespace → empty result.
 * Prefer this from ExecutionEngine after `fs.readFileString`.
 */
export const parseExecuteMdOrEmpty = (
  raw: string | undefined | null,
): ExecuteMdParsed => {
  if (raw == null || raw.trim() === '') {
    return Schema.decodeUnknownSync(ExecuteMdParsed)({ ops: [], warnings: [] })
  }
  return parseExecuteMd(raw)
}
