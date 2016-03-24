/**
 * @file Facade of kerneljs object
 * @email zmike86@gmail.com
 */

var kernel = {};

// for anonymous module Ids
var uuid = 0;
var uidprefix = 'AM@kernel_';

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

// Store for which module is being fetched.
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

/**
 * Entry point of web page.
 * @param {string} id
 */
function exec(id) {
  var argLen = arguments.length;
  if (argLen < 1) {
    throw 'require must have at least one parameter.';
  }

  // a simple require statements always be preloaded.
  // so return its complied exports object.
  var mod = resolve(id, null);
  if (mod && (mod.status >= Module.STATUS.loaded)) {
    mod.compile();
    return mod.exports;
  } else {
    throw 'module with id: ' + id + ' have not be ready';
  }
}

/**
 * Load script async and execute callback.
 * @param {Array|string} dependencies
 * @param {function} callback
 * @param {?Module} module
 */
function requireAsync(dependencies, callback, module) {
  var cnt = dependencies.length;
  // Update fetchingList.
  fetchingList.add(module);
  module.setStatus(Module.STATUS.fetching);

  var args = [];

  forEach(dependencies, function(name, index) {
    var resourceMap = kernel.data.resourceMap;
    var uri, id;
    // already record through build tool
    if (resourceMap && resourceMap[name]) {
      uri = resourceMap[name].uri;
      id = resourceMap[name].id;
    } else {
      uri = resolvePath(name, module && module.uri);
      id = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
    }

    var dependencyModule = id && Module._cache[id];
    if (dependencyModule &&
      (dependencyModule.status >= Module.STATUS.loaded)) {
      cnt--;
      return;
    }

    // record this mod and dependency in dependencyList right now.
    // for notify later.
    if (!dependencyList[uri]) {
      dependencyList[uri] = [module];
    } else if (indexOf(dependencyList[uri], module) < 0) {
      dependencyList[uri].push(module);
    }

    if (!sendingList[uri]) {
      sendingList[uri] = true;
      // load script or style
      fetch(uri, noop);
    }



    // a simple require statements always be preloaded.
    // so return its complied exports object.
    //var mod = resolve(moduleId, module);
    //if (mod && (mod.status >= Module.STATUS.loaded)) {
    //  mod.compile();
    //  return mod.exports;
    //} else {
    //  throw 'require unknown module with id: ' + moduleId;
    //}
  });

  if (cnt === 0) {
    setTimeout(function() {
      ready(module);
    }, 0);
  }
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

kernel.exec = exec;
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
// treat it as kerneljs configuration later.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
  kernel.config(kernel._kernel);
}

// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;
