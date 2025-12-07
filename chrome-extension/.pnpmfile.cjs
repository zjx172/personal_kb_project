function readPackage(pkg) {
  if (pkg.name === "sharp") {
    pkg.scripts = pkg.scripts || {};
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
