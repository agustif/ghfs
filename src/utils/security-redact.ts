import type { SecretScanningAlert } from '../types/security'

export function redactSecretValue(secret: string): string {
  if (!secret || secret.length === 0)
    return '[REDACTED]'

  if (secret.length <= 8)
    return `${secret.substring(0, 2)}***`

  const visibleLength = Math.min(4, Math.floor(secret.length * 0.2))
  const prefix = secret.substring(0, visibleLength)
  const suffix = secret.substring(secret.length - visibleLength)

  return `${prefix}***${suffix}`
}

export function redactSecretScanningAlert(alert: SecretScanningAlert): SecretScanningAlert {
  return {
    ...alert,
    secret: '[REDACTED]',
  }
}

export function redactSecretScanningAlerts(alerts: SecretScanningAlert[]): SecretScanningAlert[] {
  return alerts.map(redactSecretScanningAlert)
}

export function containsPotentialSecret(text: string): boolean {
  const patterns = [
    /gh[pousr]_\w{36}/i,
    /AKIA[0-9A-Z]{16}/,
    /(?:^|[^A-Z0-9])([A-Z0-9+/]{40})(?:$|[^A-Z0-9])/i,
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    /sk_live_[0-9a-zA-Z]{24,}/,
    /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/,
  ]

  return patterns.some(pattern => pattern.test(text))
}

export function redactPotentialSecrets(text: string): string {
  let result = text

  result = result.replace(/gh[pousr]_\w{36}/gi, match => redactSecretValue(match))

  result = result.replace(/AKIA[0-9A-Z]{16}/g, match => redactSecretValue(match))

  result = result.replace(
    /(?:^|[^A-Z0-9])([A-Z0-9+/]{40})(?:$|[^A-Z0-9])/gi,
    (match, secret, offset, string) => {
      const before = string[offset - 1] || ' '
      const after = string[offset + match.length] || ' '
      return `${before}${redactSecretValue(secret)}${after}`
    },
  )

  result = result.replace(
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    '[REDACTED PRIVATE KEY]',
  )

  result = result.replace(/sk_live_[0-9a-zA-Z]{24,}/g, match => redactSecretValue(match))

  result = result.replace(
    /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g,
    match => redactSecretValue(match),
  )

  return result
}
