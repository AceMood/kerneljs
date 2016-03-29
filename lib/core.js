
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

// expect module have been pre-build, try to resolve uri
function buildFetchUri(name, baseUri) {
  var resourceMap = kernel.data.resourceMap;
  // already record through build tool
  if (resourceMap && resourceMap[name]) {
    return resourceMap[name].uri;
  } else if (Module._cache[name]) {
    return Module._cache[name].uri;
  } else {
    return resolvePath(name, baseUri);
  }
}

/**
 * Used in the module.compile to resolve an existed module.
 * @param  {string} name moduleId or relative path
 * @param  {?string=} baseUri base for calculate path, often the host module uri.
 * @return {?Module}
 */
function resolve(name, baseUri) {
  if (Module._cache[name]) {
    return Module._cache[name];
  }

  var resourceMap = kernel.data.resourceMap;
  var mid, id, uri;
  // already record through build tool
  if (resourceMap && resourceMap[name]) {
    uri = resourceMap[name].uri;
    id = resourceMap[name].id;
    if (Module._cache[id]) {
      return Module._cache[id];
    }
  } else {
    uri = resolvePath(name, baseUri || location.href);
  }

  mid = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
  if (mid && Module._cache[mid]) {
    return Module._cache[mid];
  }

  return null;
}

/**
 * Global define|__d function.
 * define(id?, factory);
 * @param {string|function} id module Id or factory function
 * @param {?function=} factory callback function
 */
function define(id, factory) {
  var resourceMap = kernel.data.resourceMap;
  var inMap = resourceMap && resourceMap[id];

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) !== 'function') {
    throw 'define with wrong parameters ' + factory;
  }

  var uri, deps;
  if (inMap) {
    uri = resourceMap[id].uri;
    deps = resourceMap[id].deps;
  } else {
    uri = getCurrentScriptPath();
    deps = [];
    var requireTextMap = {};
    factory.toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        if (!requireTextMap[dep]) {
          deps.push(dep);
          requireTextMap[dep] = true;
        }
      });
  }

  var module = new Module({
    id: id,
    uri: uri,
    deps: deps,
    factory: factory
  });

  // cache in path2id
  recordPath2Id(uri, module.id);
  requireAsync(noop, module);
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
 * Internal api to load script async and execute callback.
 * @param {function} callback
 * @param {Module} module
 */
function requireAsync(callback, module) {
  module.setStatus(Module.Status.fetching);
  // no dependencies
  if (module.deps.length === 0) {
    ready(module);
    return;
  }

  forEach(module.deps, function(name) {
    var dependencyModule = resolve(name, module.uri);
    if (dependencyModule &&
      (dependencyModule.status >= Module.Status.loaded)) {
      module.depsCount--;
      return;
    }

    var uri = buildFetchUri(name, module.uri);
    recordDependencyList(uri, module);
    // load script or stylesheet
    fetch(uri, callback);
  });

  // might been loaded through require.async and compiled before
  if (module.checkAll() && module.status < Module.Status.loaded) {
    ready(module);
  }
}
