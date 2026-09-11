/**
 * Round-trip tests for Effect execute.md parser.
 * Copy to: src-effect/domain/execute-md.test.ts
 *
 * ALWAYS import from `@effect/vitest` — never bare `vitest`.
 */
import { Effect, Schema } from 'effect'
import { describe, expect, it } from '@effect/vitest'
import {
  ExecuteMdParsed,
  parseExecuteMd,
  parseExecuteMdEffect,
  parseExecuteMdLine,
} from './execute-md'

describe('parseExecuteMdLine', () => {
  it('parses multi-target close / reopen / unlock', () => {
    expect(parseExecuteMdLine('close #1 #2')).toEqual({
      _tag: 'ops',
      ops: [
        { action: 'close', number: 1 },
        { action: 'close', number: 2 },
      ],
    })
    expect(parseExecuteMdLine('open #3')).toEqual({
      _tag: 'ops',
      ops: [{ action: 'reopen', number: 3 }],
    })
    expect(parseExecuteMdLine('unlock #9')).toEqual({
      _tag: 'ops',
      ops: [{ action: 'unlock', number: 9 }],
    })
  })

  it('parses set-title / add-labels / add-comment', () => {
    expect(parseExecuteMdLine('set-title #2 "new title"')).toEqual({
      _tag: 'ops',
      ops: [{ action: 'set-title', number: 2, title: 'new title' }],
    })
    expect(parseExecuteMdLine('add-labels #3 foo, bar')).toEqual({
      _tag: 'ops',
      ops: [{ action: 'add-labels', number: 3, labels: ['foo', 'bar'] }],
    })
    expect(parseExecuteMdLine('comment #4 "looks good"')).toEqual({
      _tag: 'ops',
      ops: [{ action: 'add-comment', number: 4, body: 'looks good' }],
    })
  })

  it('skips comments and blanks', () => {
    expect(parseExecuteMdLine('')).toEqual({ _tag: 'skip' })
    expect(parseExecuteMdLine('# close #1')).toEqual({ _tag: 'skip' })
    expect(parseExecuteMdLine('// close #1')).toEqual({ _tag: 'skip' })
    expect(parseExecuteMdLine('<!-- close #1 -->')).toEqual({ _tag: 'skip' })
  })
})

describe('parseExecuteMd', () => {
  it('round-trips mixed lines through ExecuteOpSchema + ExecuteMdParsed', () => {
    const raw = [
      '# header',
      'close #1 #2',
      'set-title #4 "new title"',
      'add-tag #5 foo, bar',
      'add-assignees #6 antfu',
      'close-with-comment #7 "done"',
      'clear-milestone #8',
      'mark-ready-for-review #10',
      'convert-to-draft #11',
      'unknown #99',
      '<!--',
      'close #100',
      '-->',
      '',
    ].join('\n')

    const parsed = parseExecuteMd(raw)

    expect(parsed).toBeInstanceOf(ExecuteMdParsed)
    expect(parsed.ops.map(op => op.action)).toEqual([
      'close',
      'close',
      'set-title',
      'add-labels',
      'add-assignees',
      'close-with-comment',
      'clear-milestone',
      'mark-ready-for-review',
      'convert-to-draft',
    ])
    expect(parsed.ops[0]).toMatchObject({ action: 'close', number: 1 })
    expect(parsed.ops[2]).toMatchObject({ action: 'set-title', number: 4, title: 'new title' })
    expect(parsed.ops[3]).toMatchObject({ action: 'add-labels', number: 5, labels: ['foo', 'bar'] })
    expect(parsed.ops[5]).toMatchObject({ action: 'close-with-comment', number: 7, body: 'done' })
    expect(parsed.warnings).toEqual([
      'execute-md line 10: [GHFS0151] unrecognized action pattern: unknown',
    ])

    const encoded = Schema.encodeSync(ExecuteMdParsed)(parsed)
    const decoded = Schema.decodeUnknownSync(ExecuteMdParsed)(encoded)
    expect(decoded.ops).toHaveLength(parsed.ops.length)
    expect(decoded.warnings).toEqual(parsed.warnings)
  })

  it('parseExecuteMdEffect succeeds for valid document', async () => {
    const parsed = await Effect.runPromise(parseExecuteMdEffect('reopen #1\n'))
    expect(parsed.ops).toEqual([expect.objectContaining({ action: 'reopen', number: 1 })])
    expect(parsed.warnings).toEqual([])
  })
})
