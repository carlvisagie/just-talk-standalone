function readPackage(pkg) {
  // Block mysql2 completely
  if (pkg.name === 'mysql2') {
    return null;
  }
  
  // Remove mysql2 from all peer dependencies
  if (pkg.peerDependencies) {
    delete pkg.peerDependencies.mysql2;
  }
  if (pkg.peerDependenciesMeta) {
    delete pkg.peerDependenciesMeta.mysql2;
  }
  if (pkg.optionalDependencies) {
    delete pkg.optionalDependencies.mysql2;
  }
  
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
