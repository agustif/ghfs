export function createMockSecurityConfig() {
  return {
    codeScanning: true,
    secretScanning: true,
    dependabot: true,
    advisories: true,
    policy: true,
    codeqlConfigs: true,
  }
}

export function addSecurityToSyncConfig(sync: any) {
  return {
    ...sync,
    security: createMockSecurityConfig(),
  }
}
