
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
    kernel.path2id[uri].push(id)
  } else {
    kernel.path2id[uri] = [id]
  }
}

// record this mod and dependency in dependencyList right now.
// for notify later.
function recordDependencyList(uri, module) {
  if (!dependencyList[uri]) {
    dependencyList[uri] = [module]
  } else if (indexOf(dependencyList[uri], module) < 0) {
    dependencyList[uri].push(module)
  }
}

// expect module have been pre-build, try to resolve uri
function buildFetchUri(name, baseUri) {
  var resourceMap = kernel.data.resourceMap;
  var type = 'js';
  if (/^css:/.test(name)) {
    type = 'css';
    name = name.replace(/^css:/, '')
  }

  // already record through build tool
  if (resourceMap && resourceMap[type][name]) {
    return resourceMap[type][name].uri
  } else if (Module._cache[name]) {
    return Module._cache[name].uri
  } else {
    return resolvePath(name, baseUri)
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
    return Module._cache[name]
  }

  var type = 'js';
  if (/^css:/.test(name)) {
    type = 'css';
    name = name.replace(/^css:/, '')
  }

  var resourceMap = kernel.data.resourceMap;
  var mid, id, uri;
  // already record through build tool
  if (resourceMap && resourceMap[type][name]) {
    uri = resourceMap[type][name].uri;
    id = name;
    if (Module._cache[id]) {
      return Module._cache[id]
    }
  } else {
    uri = resolvePath(name, baseUri || location.href)
  }

  mid = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
  if (mid && Module._cache[mid]) {
    return Module._cache[mid]
  }

  return null
}

/**
 * Global define function.
 * define(id?, factory);
 * @param {string|function} id module Id or factory function
 * @param {?function=} factory callback function
 */
function define(id, factory) {
  Module.define(id, factory, false)
}

/**
 * When a module is ready, means that all its dependencies have been
 * loaded and its depsCount should be zero.
 * @param {Module} module
 */
function ready(module) {
  module.setStatus(Module.Status.ready);
  if (module.isEntryPoint) {
    module.compile()
  }

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
        ready(dependant)
      }
    });
  }
}
