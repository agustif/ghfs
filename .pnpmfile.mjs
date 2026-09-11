function rewriteExports(exportsField) {
  if (!exportsField || typeof exportsField !== 'object') return exportsField
  const out = Array.isArray(exportsField) ? [] : {}
  for (const [key, value] of Object.entries(exportsField)) {
    if (typeof value === 'string') {
      out[key] = value.replace(/^\.\/lib\//, './src/').replace(/\.js$/, '.ts').replace(/\.d\.ts$/, '.ts')
    } else if (value && typeof value === 'object') {
      out[key] = rewriteExports(value)
    } else {
      out[key] = value
    }
  }
  return out
}

function rewriteAlchemy(pkg, context) {
  if (pkg.name !== "alchemy" && pkg.name !== "@alchemy.run/monorepo") {
    return pkg
  }
  context.log("pnpmfile: rewriting " + pkg.name + "@" + pkg.version + " for consumer install")
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies", "devDependencies"]) {
    const bag = pkg[field]
    if (!bag) continue
    for (const [name, version] of Object.entries(bag)) {
      if (typeof version !== "string") continue
      if (version === "workspace:*" || version.startsWith("workspace:") || version.startsWith("catalog:")) {
        delete bag[name]
      }
    }
  }
  if (pkg.scripts) {
    delete pkg.scripts.prepare
    delete pkg.scripts.preinstall
    delete pkg.scripts.postinstall
  }
  if (pkg.name === "alchemy") {
    pkg.exports = rewriteExports(pkg.exports)
    if (typeof pkg.types === "string") {
      pkg.types = pkg.types.replace(/^\.\/lib\//, "./src/").replace(/\.d\.ts$/, ".ts")
    }
    pkg.typesVersions = undefined
  }
  return pkg
}

export const hooks = {
  readPackage(pkg, context) {
    return rewriteAlchemy(pkg, context)
  },
}
