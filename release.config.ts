export interface ReleaseConfig {
  targets: {
    npm: boolean
    githubPackages: boolean
    containers: boolean
  }
  attestations: {
    slsa: boolean
    sigstore: boolean
    npmProvenance: boolean
  }
  deployments: {
    demo: boolean
    githubPages: boolean
  }
  observability: {
    autoReport: boolean
    notifyOnRelease: boolean
  }
}

export const defaultConfig: ReleaseConfig = {
  targets: {
    npm: true,
    githubPackages: false,
    containers: false,
  },
  attestations: {
    slsa: true,
    sigstore: true,
    npmProvenance: true,
  },
  deployments: {
    demo: false,
    githubPages: false,
  },
  observability: {
    autoReport: true,
    notifyOnRelease: true,
  },
}

export default defaultConfig
