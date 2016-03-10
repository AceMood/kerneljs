/**
 * @file Facade of kerneljs object
 * @email zmike86@gmail.com
 */

var kernel = {};

// if a global kerneljs object exists,
// treat it as kerneljs configuration later.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
}

// for anonymous module Ids
var uuid = 0;
var uidprefix = 'AceMood@kernel_';

/**
 * Stores all modules that is fetching.
 * Use module's uid and module as key-pairs.
 */
var fetchingList = {
  mods: {},
  add: function(mod) {
    if (this.mods[mod.uid]) {
      emit(
        events.error,
        [
          'current mod with uid: ' + mod.uid + ' and file path: ' +
          mod.uri + ' is fetching now'
        ]
      );
    }
    this.mods[mod.uid] = mod;
  },
  clear: function() {
    this.mods = {};
  },
  remove: function(mod) {
    if (this.mods[mod.uid]) {
      this.mods[mod.uid] = null;
      delete this.mods[mod.uid];
    }
  }
};

// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here, module
// self as value.
var dependencyList = {};

/**
 * 如果某个模块处于fetching的状态则说明依赖的js模块文件正在下载，在完成下载之前我们
 * 不希望同一个文件发起两次下载请求。define时会缓存到cache.path2uid对象中，我们这里
 * 用path作为key标识模块文件正在下载
 */
var sendingList = {};

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

function globalRequire() {

}

// clear all relative cache
kernel.reset = function() {
  Module._cache = {};
  this.path2id = {};
  this.data = {};
  handlersMap = {};
};

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

// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;

// config with preserved global kerneljs object
if (kernel._kernel) {
  kernel.config(kernel._kernel);
}
