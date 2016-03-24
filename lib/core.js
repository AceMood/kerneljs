
// extract `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// remove line/block comments
  commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

/** same module Id error */
function exist_id_error(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

/**
 * global define.
 * define(id?, factory);
 * @param {string|function|object} id module Id
 * @param {(function|object)?} factory callback function
 */
function define(id, factory) {
  var mod;
  var resourceMap = kernel.data.resourceMap,
    inMap = resourceMap && resourceMap[id];

  // If module in resourceMap, get its uri property.
  // doc.currentScript is not always available.
  var uri = inMap ? resourceMap[id].uri : getCurrentScriptPath();
  var deps = inMap ? resourceMap[id].deps : [];

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) === 'object') {
    mod = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: null
    });

    mod.exports = factory;
    mod.setStatus(Module.STATUS.complete);
    ready(mod);
  } else if (typeOf(factory) === 'function') {
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        deps.push(dep);
      });

    mod = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: factory
    });

    loadDependency(mod);
  } else {
    throw 'define with wrong parameters in ' + uri;
  }

  // cache in path2id
  if (kernel.path2id[uri]) {
    kernel.path2id[uri].push(mod.id);
  } else {
    kernel.path2id[uri] = [mod.id];
  }
}

/**
 * Load module's dependencies.
 * @param {Module} module Module object.
 */
function loadDependency(module) {
  var cnt = module.deps.length;
  // Update fetchingList.
  fetchingList.add(module);
  module.setStatus(Module.STATUS.fetching);

  forEach(module.deps, function(name) {
    var resourceMap = kernel.data.resourceMap;
    var uri, id;
    // already record through build tool
    if (resourceMap && resourceMap[name]) {
      uri = resourceMap[name].uri;
      id = resourceMap[name].id;
    } else {
      uri = resolvePath(name, module.uri);
      id = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
    }

    var dependencyModule = id && Module._cache[id];
    if (dependencyModule &&
      (dependencyModule.status === Module.STATUS.complete)) {
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
  });

  if (cnt === 0) {
    ready(module);
  }
}

/**
 * 当一个模块已经准备就绪, 意味着它的所有以来全部都加载完毕并且回调函数
 * 已经执行完毕. 在此通知依赖于此模块的其他模块.
 * @param {Module} mod 已完毕的模块对象
 */
function ready(mod) {
  fetchingList.remove(mod);
  mod.setStatus(Module.STATUS.loaded);

  // Inform all module that depend on this current module.
  var dependants = dependencyList[mod.uri];
  if (dependants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[mod.uri];
    forEach(dependants, function(dependant) {
      if (dependant.status === Module.STATUS.fetching) {
        if (dependant.checkAll()) {
          ready(dependant);
        }
      }
    });
  }
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} id moduleId or relative path
 * @param  {?Module=} mod for calculate path.
 * @return {?object}
 */
function resolve(id, mod) {
  var path = resolvePath(id, (mod && mod.uri) || getCurrentScriptPath());
  var mid = kernel.path2id[path] ? kernel.path2id[path][0] : null;
  return Module._cache[id] || Module._cache[mid] || null;
}
