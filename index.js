// ===============================================
// Forbidden!
// Don't require('kerneljs') in node environment.
// We only support a browser-side module loader.
// ===============================================

// export
require('./dist/kernel');
module.exports = kernel;