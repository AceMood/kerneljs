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
 * --baseUrl:     All relative paths should be resolved base on this uri
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
          kernel.data[key][k] = obj[key][k];
        }
      } else {
        kernel.data[key] = obj[key];
      }
    }
  }
}

// clear all relative cache
kernel.reset = function() {
  Module._cache = {};
  this.path2id = {};
  this.data = {};
  handlersMap = {};
};

// helper function
kernel.getCache = function() {
  return Module._cache;
};

kernel.config = config;
kernel.on = on;
kernel.emit = emit;
kernel.request = fetchScript;
kernel.eventsType = events;
kernel.data = {};
// 理论上每个文件可能定义多个模块，也就是define了多次。这种情况应该在开发时严格避免，
// 但经过打包之后一定会出现这种状况。所以我们必须要做一些处理，也使得这个结构是一对多的.
kernel.path2id = {};

// config with preserved global kerneljs object
// if a global kerneljs object exists,
// treat it as kerneljs configuration.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
  kernel.config(kernel._kernel);
}

// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;
