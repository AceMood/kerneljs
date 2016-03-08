
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
  var mod, deps = [];
  // doc.currentScript is not always available.
  var resourceMap = kernel.data.resourceMap,
    inMap = resourceMap && resourceMap[id];

  // If module in resourceMap, get its uri property.
  var uri = inMap ? resourceMap[id].uri : getCurrentScriptPath();

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
  } else if (typeOf(factory) !== 'function') {
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function (match, quote, dep) {
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
 * @param {Module} mod Module object.
 */
function loadDependency(mod) {
  var count = mod.deps.length;

  // Update fetchingList.
  fetchingList.add(mod);
  mod.setStatus(Module.STATUS.fetching);

  forEach(mod.deps, function(name) {
    var resourceMap = kernel.data.resourceMap;
    var path = '';
    // already record through build tool
    if (resourceMap && resourceMap[name]) {
      path = resourceMap[name].uri;
    } else {
      path = resolvePath(name, mod.uri);
    }

    var id = kernel.path2id[path][0];
    var dependencyModule = id && Module._cache[id];
    // If module's status is `complete`.
    if (dependencyModule && (dependencyModule.status === Module.STATUS.complete)) {
      --count;
      return;
    }

    // It's a user-defined or not been fetched file.
    // If it's a user-defined id and not config in global alias,
    // it will produce a 404 error.
    // record this mod depend on the dep current now.
    if (!dependencyList[path]) {
      dependencyList[path] = [mod];
    } else if (indexOf(dependencyList[path], mod) < 0) {
      dependencyList[path].push(mod);
    }

    if (!sendingList[path]) {
      sendingList[path] = true;
      // 加载模块
      fetch(path, name, noop);
    }
  });

  // If all module have been cached.
  // In notify, mod will be removed from fetchingList
  if (count === 0) {
    notify(mod);
  }
}

/**
 * 当一个模块已经准备就绪, 意味着它的所有以来全部都加载完毕并且回调函数
 * 已经执行完毕. 在此通知依赖于此模块的其他模块.
 * @param {Module} mod 已完毕的模块对象
 */
function notify(mod) {
  fetchingList.remove(mod);
  mod.compile();

  // 注册
  kerneljs.cache.mods[mod.uid] = mod;
  if (mod.id) {
    kerneljs.cache.mods[mod.id] = mod;
  }

  // 通知依赖项.
  var depandants = dependencyList[mod.url];
  if (depandants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[mod.url];
    forEach(depandants, function(dependant) {
      if (dependant.ready && dependant.status === Module.STATUS.fetching) {
        dependant.ready(mod);
      }
    });
  }
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} id moduleId or relative path
 * @param  {?Module=} mod for calculate path.
 * @return {object}
 */
function resolve(id, mod) {
  var path = resolvePath(id, (mod && mod.uri) || getCurrentScriptPath());
  return Module._cache[id] || Module._cache[kernel.path2id[path][0]];
}

// define.amd property, conforms to the AMD API.
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};
