
// extract `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g;
// remove line/block comments
var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here, module
// self as value.
var dependencyList = {};

// Store for which module is being fetched.
var sendingList = {};

// same module Id error
function existIdError(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

// record cache in path2id
function recordPath2Id(uri, id) {
  if (kernel.path2id[uri]) {
    kernel.path2id[uri].push(id);
  } else {
    kernel.path2id[uri] = [id];
  }
}

// record this mod and dependency in dependencyList right now.
// for notify later.
function recordDependencyList(uri, module) {
  if (!dependencyList[uri]) {
    dependencyList[uri] = [module];
  } else if (indexOf(dependencyList[uri], module) < 0) {
    dependencyList[uri].push(module);
  }
}

// expect module have been pre-build, try to resolve id & uri
function buildIdAndUri(name, baseUri) {
  var resourceMap = kernel.data.resourceMap;
  var uri, id;
  // already record through build tool
  if (resourceMap && resourceMap[name]) {
    uri = resourceMap[name].uri;
    id = resourceMap[name].id;
  } else if (Module._cache[name]) {
    uri = Module._cache[name].uri;
    id = name;
  } else {
    uri = resolvePath(name, baseUri);
    id = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
  }
  return {
    uri: uri,
    id: id
  };
}

/**
 * Global define|__d function.
 * define(id?, factory);
 * @param {string|function} id module Id or factory function
 * @param {?function=} factory callback function
 */
function define(id, factory) {
  var module;
  var resourceMap = kernel.data.resourceMap;
  var inMap = resourceMap && resourceMap[id];

  // If module in resourceMap, get its uri property.
  // document.currentScript is not always available.
  var uri = inMap ? resourceMap[id].uri : getCurrentScriptPath();
  var deps = inMap ? resourceMap[id].deps : [];
  var requireTextMap = {};

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) === 'function') {
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        if (!requireTextMap[dep]) {
          deps.push(dep);
          requireTextMap[dep] = true;
        }
      });

    module = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: factory
    });

    // cache in path2id
    recordPath2Id(uri, module.id);
    requireAsync(null, noop, module);

  } else {
    throw 'define with wrong parameters in ' + uri;
  }
}

/**
 * When a module is ready, means that all the dependencies have been ready.
 * @param {Module} module
 */
function ready(module) {
  module.setStatus(Module.Status.loaded);
  module.compile();

  // Inform all module that depend on current module.
  var dependants = dependencyList[module.uri];
  if (dependants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[module.uri];
    forEach(dependants, function(dependant) {
      dependant.depsCount--;
      if (dependant.checkAll() &&
        (dependant.status === Module.Status.fetching)) {
        ready(dependant);
      }
    });
  }
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} id moduleId or relative path
 * @param  {?Module=} mod for calculate path.
 * @return {?Module}
 */
function resolve(id, mod) {
  if (Module._cache[id]) {
    return Module._cache[id];
  }
  var path = resolvePath(id, (mod && mod.uri) || location.href);
  var mid = kernel.path2id[path] ? kernel.path2id[path][0] : null;
  return Module._cache[mid] || null;
}

/**
 * Internal api to load script async and execute callback.
 * @param {?Array} dependencies
 * @param {function} callback
 * @param {Module} module
 */
function requireAsync(dependencies, callback, module) {
  // called from require.async
  if (module.status >= Module.Status.loaded) {
    var args = new Array(dependencies.length);
    var cnt = dependencies.length;
    forEach(dependencies, function(name, index) {
      function onLoad() {
        var ret = buildIdAndUri(name, module.uri);
        dependencyModule = ret.id && Module._cache[ret.id];
        // might need other modules
        if (dependencyModule.status >= Module.Status.loaded) {
          args[index] = dependencyModule.compile();
        }

        cnt--;
        if (cnt === 0) {
          callback.apply(null, args);
        }
      }

      var ret = buildIdAndUri(name, module.uri);
      var dependencyModule = ret.id && Module._cache[ret.id];
      if (dependencyModule &&
        (dependencyModule.status >= Module.Status.loaded)) {
        args[index] = dependencyModule.compile();
        cnt--;
        return;
      }
      // load script or style
      fetch(ret.uri, onLoad);
    });

    if (cnt === 0) {
      callback.apply(null, args);
    }
  }
  // called from define
  else {
    module.setStatus(Module.Status.fetching);

    // no dependencies
    if (module.deps.length === 0) {
      ready(module);
      return;
    }

    forEach(module.deps, function(name) {
      var ret = buildIdAndUri(name, module.uri);
      var dependencyModule = ret.id && Module._cache[ret.id];
      if (dependencyModule &&
        (dependencyModule.status >= Module.Status.loaded)) {
        module.depsCount--;
        return;
      }

      recordDependencyList(ret.uri, module);
      // load script or style
      fetch(ret.uri, callback);
    });

    // might been loaded through require.async and compiled before
    if (module.checkAll() && module.status < Module.Status.loaded) {
      ready(module);
    }
  }
}
