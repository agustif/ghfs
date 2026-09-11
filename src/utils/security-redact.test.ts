import { describe, expect, it } from 'vitest'
import { containsPotentialSecret, redactPotentialSecrets, redactSecretValue } from './security-redact'

describe('security-redact', () => {
  describe('redactSecretValue', () => {
    it('should redact short secrets', () => {
      expect(redactSecretValue('abc123')).toBe('ab***')
    })

    it('should redact medium secrets', () => {
      expect(redactSecretValue('ghp_1234567890')).toBe('gh***90')
    })

    it('should redact long secrets', () => {
      expect(redactSecretValue('ghp_1234567890abcdefghijklmnopqrstuvwxyz')).toBe('ghp_***wxyz')
    })

    it('should handle empty secrets', () => {
      expect(redactSecretValue('')).toBe('[REDACTED]')
    })
  })

  describe('containsPotentialSecret', () => {
    it('should detect GitHub tokens', () => {
      expect(containsPotentialSecret('ghp_1234567890123456789012345678901234abcd')).toBe(true)
      expect(containsPotentialSecret('gho_1234567890123456789012345678901234abcd')).toBe(true)
      expect(containsPotentialSecret('ghu_1234567890123456789012345678901234abcd')).toBe(true)
      expect(containsPotentialSecret('ghs_1234567890123456789012345678901234abcd')).toBe(true)
      expect(containsPotentialSecret('ghr_1234567890123456789012345678901234abcd')).toBe(true)
    })

    it('should detect AWS keys', () => {
      expect(containsPotentialSecret('AKIAIOSFODNN7EXAMPLE')).toBe(true)
    })

    it('should detect private keys', () => {
      expect(containsPotentialSecret('-----BEGIN RSA PRIVATE KEY-----\nMIIE...')).toBe(true)
      expect(containsPotentialSecret('-----BEGIN PRIVATE KEY-----\nMIIE...')).toBe(true)
    })

    it('should detect Stripe keys', () => {
      expect(containsPotentialSecret(`sk_live_${'A'.repeat(40)}`)).toBe(true)
    })

    it('should detect JWTs', () => {
      expect(containsPotentialSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')).toBe(true)
    })

    it('should not flag regular text', () => {
      expect(containsPotentialSecret('This is just a regular sentence.')).toBe(false)
      expect(containsPotentialSecret('Hello world')).toBe(false)
    })
  })

  describe('redactPotentialSecrets', () => {
    it('should redact GitHub tokens in text', () => {
      const input = 'My token is ghp_1234567890123456789012345678901234abcd and it works'
      const output = redactPotentialSecrets(input)
      expect(output).not.toContain('ghp_1234567890123456789012345678901234abcd')
      expect(output).toContain('ghp_')
    })

    it('should redact AWS keys in text', () => {
      const input = 'AWS key: AKIAIOSFODNN7EXAMPLE'
      const output = redactPotentialSecrets(input)
      expect(output).not.toContain('AKIAIOSFODNN7EXAMPLE')
    })

    it('should redact private keys', () => {
      const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
      const output = redactPotentialSecrets(input)
      expect(output).toBe('[REDACTED PRIVATE KEY]')
    })

    it('should redact multiple secrets', () => {
      const input = 'Token: ghp_1234567890123456789012345678901234abcd, AWS: AKIAIOSFODNN7EXAMPLE'
      const output = redactPotentialSecrets(input)
      expect(output).not.toContain('ghp_1234567890123456789012345678901234abcd')
      expect(output).not.toContain('AKIAIOSFODNN7EXAMPLE')
    })

    it('should preserve non-secret text', () => {
      const input = 'This is a normal sentence with no secrets.'
      const output = redactPotentialSecrets(input)
      expect(output).toBe(input)
    })
  })
})
