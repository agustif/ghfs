export function redactSensitiveData<T>(data: T): T {
  if (data === null || data === undefined)
    return data

  if (typeof data === 'string') {
    return redactTokens(data) as T
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item)) as T
  }

  if (typeof data === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (shouldRedactKey(key)) {
        result[key] = '[REDACTED]'
      }
      else {
        result[key] = redactSensitiveData(value)
      }
    }
    return result
  }

  return data
}

function shouldRedactKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  const sensitivePatterns = [
    'token',
    'secret',
    'password',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'private_key',
    'client_secret',
    'bearer',
    'authorization',
  ]

  return sensitivePatterns.some(pattern => lowerKey.includes(pattern))
}

function redactTokens(text: string): string {
  const patterns = [
    /ghp_[a-zA-Z0-9]{36}/g,
    /gho_[a-zA-Z0-9]{36}/g,
    /ghu_[a-zA-Z0-9]{36}/g,
    /ghs_[a-zA-Z0-9]{36}/g,
    /ghr_[a-zA-Z0-9]{36}/g,
    /github_pat_\w{82}/g,
    /Bearer\s+[\w.-]+/gi,
  ]

  let result = text
  for (const pattern of patterns) {
    result = result.replace(pattern, '[REDACTED_TOKEN]')
  }

  return result
}
