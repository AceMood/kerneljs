
// extract `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// remove line/block comments
  commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

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

// same module Id error
function exist_id_error(id) {
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
  } else {
    uri = resolvePath(name, baseUri);
    id = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
  }
  return {
    uri: uri,
    id: id
  }
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

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) === 'function') {
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        deps.push(dep);
      });

    module = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: factory
    });

    // cache in path2id
    recordPath2Id(uri, module.id);
    loadDependency(module, noop);

  } else {
    throw 'define with wrong parameters in ' + uri;
  }
}

/**
 * Load module's dependencies.
 * @param {Module} module
 * @param {function} callback
 */
function loadDependency(module, callback) {
  requireAsync(null, callback, module);
}

/**
 * When a module is ready, means that all the dependencies have been ready.
 * @param {Module} module
 */
function ready(module) {
  fetchingList.remove(module);
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
      if (dependant.status === Module.Status.fetching) {
        if (dependant.checkAll()) {
          ready(dependant);
        }
      }
    });
  }
}

// async ready for consistence
function doAsyncNotify(module) {
  setTimeout(function() {
    ready(module);
  }, 0);
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} id moduleId or relative path
 * @param  {?Module=} mod for calculate path.
 * @return {?object}
 */
function resolve(id, mod) {
  var path = resolvePath(id, (mod && mod.uri) || location.href);
  var mid = kernel.path2id[path] ? kernel.path2id[path][0] : null;
  return Module._cache[id] || Module._cache[mid] || null;
}

/**
 * Internal api to load script async and execute callback.
 * @param {?Array} dependencies
 * @param {function} callback
 * @param {?Module} module
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
        args[index] = dependencyModule.compile();
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

      // recordDependencyList(ret.uri, module);
      if (!sendingList[ret.uri]) {
        sendingList[ret.uri] = true;
        // load script or style
        fetch(ret.uri, onLoad);
      } else {

      }
    });

    if (cnt === 0) {
      doAsyncNotify(module);
    }
  }
  // called from define
  else {
    // Update fetchingList.
    fetchingList.add(module);
    module.setStatus(Module.Status.fetching);

    // no dependencies
    if (module.deps.length === 0) {
      doAsyncNotify(module);
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
      if (!sendingList[ret.uri]) {
        sendingList[ret.uri] = true;
        // load script or style
        fetch(ret.uri, callback);
      }
    });

    if (module.checkAll()) {
      doAsyncNotify(module);
    }
  }
}
