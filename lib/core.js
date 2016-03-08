
// 正则提取代码中的 `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// 去掉源码中的注释
  commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// 初始化的空模块
var empty_mod = {
  id: null,
  uid: null,
  url: null,
  status: null,
  exports: {}
};

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

/** same module Id error */
function exist_id_error(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

/**
 * global define.
 * define(id?, factory);
 * @param {string|Array|function|object} id module Id
 * @param {(function|object)?} factory callback function
 */
function define(id, factory) {
  var mod, deps;
  // doc.currentScript is not always available.
  // 但如果不是这种情况且遵循每个文件一个define模块的话这个属性就能正常工作.
  var uri = getCurrentScriptPath();

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) !== 'function') {
    throw 'define with wrong parameters in ' + uri;
  }

  deps = [];
  // extract `require('xxx')`
  factory
    .toString()
    .replace(commentRegExp, '')
    .replace(cjsRequireRegExp, function(match, quote, dep) {
      deps.push(dep);
    });

  // user defined id
  if (id) {
    if (Module._cache[id] && kernel.debug) {
      emit(
        events.error,
        [
          SAME_ID_MSG.replace('%s', id),
          uri
        ]
      );
      return exist_id_error(id);
    }
  }

  // create module
  mod = new Module({
    id: id,
    url: uri,
    deps: deps,
    factory: factory
  });

  // cache in path2id
  if (kernel.path2id[uri]) {
    kernel.path2id[uri].push(mod.id);
  } else {
    kernel.path2id[uri] = [mod.id];
  }

  emit(events.create, [mod]);

  // 更新mod.depExports
  mod.resolveDeps();

  // load dependencies
  load(mod);
}

/**
 * 加载依赖模块文件.
 * @param {Object|Module} mod 宿主模块.
 */
function load(mod) {
  var cache = kernel.cache,
    count = mod.deps.length,
    inPathConfig = kernel.data.paths && kernel.data.paths[mod.id];

  // 若mod.id在paths中已经配置则相对路径是location.href,
  // 详见: config_path_relative test case.
  var currentPath = inPathConfig ? loc.href : mod.url;

  // 更新fetchingList.
  fetchingList.add(mod);

  // Register module in global cache with an empty.
  // export for later checking if its status is available.
  if (!cache.mods[mod.uid]) {
    cache.mods[mod.uid] = empty_mod;
  }

  // 更新模块状态
  mod.setStatus(Module.STATUS.fetching);

  forEach(mod.deps, function(name, index) {
    // 模块更新depExports之后, 预置的模块和已经导出的模块均已可用.
    // 尤其构建合并js文件后会是这种情况.
    if (mod.depExports[index]) {
      return --count;
    }

    // else it's a real file path. get its responding uid
    var path = resolvePath(name, currentPath);
    var uid = cache.path2uid[path];

    // 如果加载模块的请求已经发出但模块没加载完成, 模块的状态是`fetching`.
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (uid && cache.mods[uid[0]] &&
      (cache.mods[uid[0]].status === Module.STATUS.complete ||
      checkCycle(path, mod))) {
      --count;
      mod.depExports[index] = cache.mods[uid[0]].exports;
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
 * require has two approaches:
 * a. var mod = require('widget/a');
 * b. require.async(['widget/a'], function(wid_a) {
 *      wid_a.init();
 *    });
 * @param {!string} moduleId module id or relative path
 */
function localRequire(moduleId) {
  var argLen = arguments.length;

  if (argLen < 1) {
    throw 'require must have at least one parameter.';
  }

  var mod = Module._cache[moduleId];
  if (mod) {
    return mod.exports ? mod.exports : mod.factory.call(null, localRequire, )
  }

  var uri = getCurrentScriptPath();

  if (typeOf(deps) === 'string' && argLen === 1) {
    return requireDirectly(deps, uri);
  } else {
    if (typeOf(cb) !== 'function') {
      throw 'Global require\'s args TypeError.';
    }
    // 为`require([], cb)`的调用生成一个匿名模块, 分配其uid且id为null
    var mod = new Module({
      id: null,
      url: uri,
      deps: deps,
      factory: cb
    });

    // 更新mod.depExports
    forEach(deps, function(dep, index) {
      mod.depExports[index] = resolve(dep, mod);
    });

    load(mod);
  }
}

/**
 * 调用require的方式是`require('xxx')`
 * @param {String} id 请求的模块id
 * @param {String} baseUri 解析请求模块需要的base网路地址
 * @returns {?Module|Object} 返回请求模块
 */
function requireDirectly(id, baseUri) {
  // 如果依赖css.
  var index = id.indexOf('.css');
  if (index > 0 && index === id.length - 4) {
    return {}; //todo
  }

  // a simple require statements always be resolved preload.
  // so return its exports object.
  var inject = resolve(id);
  if (inject) {
    return inject;
  } else {
    var realPath = resolvePath(id, baseUri);
    var uid = kerneljs.cache.path2uid[realPath][0];
    return kerneljs.cache.mods[uid].exports || null;
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
 * Used in the CommonJS wrapper form of define a module.
 * @param {String} id 模块id
 * @param {?Module=} mod 传入这个参数是为了CommonJS方式要传入mod.exports.
 * @return {Object}
 */
function resolve(id, mod) {
  // step 1: CommonJS
  if (id === 'require') {
    return require;
  } else if (id === 'module') {
    return mod;
  } else if (id === 'exports') {
    return mod && mod.exports;
  }

  // step 2: parse built-in and already existed modules
  var cache = kerneljs.cache;
  if (cache.mods[id]) {
    var path = resolvePath(id, (mod && mod.url) || getCurrentScriptPath());
    var cacheMod = cache.mods[id] ||
      cache.mods[cache.path2uid[path][0]];
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (cacheMod.status === Module.STATUS.complete ||
      checkCycle(path, mod)) {
      return cacheMod.exports;
    }
  }

  return null;
}

/**
 * 检查简单的循环依赖. 更多循环依赖的建议见:
 * `http://requirejs.org/docs/api.html#circular`.
 * `http://dojotoolkit.org/documentation/tutorials/1.9/modules_advanced/`
 *
 * todo only simple cycle refer done here
 * @param {String} path A file path that contains the fetching module.
 *     We should resolve the module with url set to this dep and check its
 *     dependencies to know whether there  produce a cycle reference.
 * @param {Module|Object} mod current parse module.
 * @return {Boolean} true if there has a cycle reference and vice versa.
 */
function checkCycle(path, mod) {
  var ret = false;
  var uid = kerneljs.cache.path2uid[path];
  var m;
  if (uid && (m = kerneljs.cache.mods[uid[0]])) {
    if (indexOf(dependencyList[mod.url], m) >= 0) {
      ret = true;
    }
  }

  return ret;
}

/**
 * Resolve path of the given id.
 * @param {String} id
 * @return {!(String|Object)}
 */
require.toUrl = function(id) {
  return resolvePath(id);
};

/**
 * 用于页面初始化完毕后异步加载模块.
 * @param {!String} id 模块id.
 * @param {!Function} callback 回调函数.
 */
require.async = function(id, callback) {
  var type = typeOf(id);
  if (type === 'string') {
    require([id], callback);
  } else if (type === 'array') {
    require(id, callback);
  }
};

// define.amd property, conforms to the AMD API.
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};
