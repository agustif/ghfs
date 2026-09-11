import { expect, it } from '@effect/vitest'
import {
  ApplyError,
  ConfigError,
  ExecuteError,
  FileSystemError,
  GitHubError,
  SyncError,
  ValidationError,
} from '../domain'

it('GitHubError is a tagged error', () => {
  const error = new GitHubError({
    status: 404,
    message: 'Not found',
    details: { path: '/repos/owner/repo' },
  })

  expect(error._tag).toBe('GitHubError')
  expect(error.status).toBe(404)
  expect(error.message).toBe('Not found')
})

it('SyncError includes number and cause', () => {
  const error = new SyncError({
    message: 'Failed to sync',
    number: 123,
    cause: new Error('Network error'),
  })

  expect(error._tag).toBe('SyncError')
  expect(error.message).toBe('Failed to sync')
  expect(error.number).toBe(123)
  expect(error.cause).toBeInstanceOf(Error)
})

it('ConfigError includes field', () => {
  const error = new ConfigError({
    message: 'Invalid config',
    field: 'GHFS_REPO',
  })

  expect(error._tag).toBe('ConfigError')
  expect(error.field).toBe('GHFS_REPO')
})

it('FileSystemError includes path', () => {
  const error = new FileSystemError({
    message: 'Cannot read file',
    path: '/tmp/test.md',
  })

  expect(error._tag).toBe('FileSystemError')
  expect(error.path).toBe('/tmp/test.md')
})

it('ExecuteError includes operation and number', () => {
  const error = new ExecuteError({
    message: 'Execution failed',
    operation: 'close',
    number: 42,
  })

  expect(error._tag).toBe('ExecuteError')
  expect(error.operation).toBe('close')
  expect(error.number).toBe(42)
})

it('ValidationError includes field and value', () => {
  const error = new ValidationError({
    message: 'Invalid value',
    field: 'state',
    value: 'invalid',
  })

  expect(error._tag).toBe('ValidationError')
  expect(error.field).toBe('state')
  expect(error.value).toBe('invalid')
})

it('ApplyError includes planId and uri', () => {
  const error = new ApplyError({
    message: 'Failed to decode ApplyPlan',
    planId: 'plan-1',
    uri: 'ghfs:label:bug',
  })

  expect(error._tag).toBe('ApplyError')
  expect(error.message).toBe('Failed to decode ApplyPlan')
  expect(error.planId).toBe('plan-1')
  expect(error.uri).toBe('ghfs:label:bug')
})
