/**
 * @file Facade of kerneljs object
 * @email zmike86@gmail.com
 */

var kernel = {};

// for anonymous module Ids
var uuid = 0;
var uidprefix = 'AM@kernel_';

/**
 * Config kernel object at any time. Options:
 * --paths: replace head part of a given path
 * --resourceMap: All pre-built-in modules and dependencies. If a module has been
 *                registered in resourceMap, skip parse module's source code for
 *                dependency.
 */
function config(obj) {
  if (typeOf(obj) !== 'object') {
    throw 'config object must an object';
  }
  var key, k;
  for (key in obj) {
    if (hasOwn.call(obj, key)) {
      if (kernel.data[key]) {
        for (k in obj[key]) {
          kernel.data[key][k] = obj[key][k]
        }
      } else {
        kernel.data[key] = obj[key]
      }
    }
  }
}

// clear all relative cache
kernel.reset = function() {
  Module._cache = {};
  this.path2id = {};
  this.data = {};
  handlersMap = {}
};

// helper function
kernel.getCache = function() {
  return Module._cache
};

kernel.config = config;
kernel.on = on;
kernel.emit = emit;
kernel.request = fetchScript;
kernel.eventsType = events;
// Store configuration object
kernel.data = {};
// One javascript file can define more than one module.
// We never do that when dev time. But not after build process.
// Key-value pairs would be path->Array.<id>
kernel.path2id = {};

// define an entry point module
kernel.exec = function(id, factory) {
  Module.define(id, factory, true)
};

// config with preserved global kerneljs object
// if a global kerneljs object exists,
// treat it as kerneljs configuration.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
  kernel.config(kernel._kernel)
}

// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;
