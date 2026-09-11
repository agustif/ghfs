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
  return pkg
}

export const hooks = {
  readPackage(pkg, context) {
    return rewriteAlchemy(pkg, context)
  },
}
