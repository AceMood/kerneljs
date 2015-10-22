
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

// ID相同的错误消息
var SAME_ID_MSG = 'more then one module defined with the same id: %s';

/**
 * 若两个模块id相同则报错
 */
function exist_id_error(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

/**
 * 全局define函数. 函数签名:
 * define(id?, dependencies?, factory);
 * 见: https://github.com/amdjs/amdjs-api/blob/master/AMD.md#define-function-
 * @param {String|Array|Function|Object} id 模块id
 * @param {Array|Function|Object} deps      依赖模块
 * @param {(Function|Object)?} factory      回调函数
 */
function define(id, deps, factory) {
  var mod,
      cache = kerneljs.cache,
      uid = uidprefix + uuid++;

  // doc.currentScript在异步情况下比如事件处理器或者setTimeout返回错误结果.
  // 但如果不是这种情况且遵循每个文件一个define模块的话这个属性就能正常工作.
  var uri = getCurrentScriptPath();

  // 处理参数
  if (typeOf(id) !== 'string') {
    factory = deps;
    deps = id;
    id = null;
  }

  if (typeOf(deps) !== 'array') {
    factory = deps;
    deps = null;
  }

  // 缓存path2uid
  if (cache.path2uid[uri]) {
    cache.path2uid[uri].push(uid);
  } else {
    cache.path2uid[uri] = [uid];
  }

  // CommonJS
  if (!deps && typeOf(factory) === 'function') {
    deps = [];
    // 在回调函数中提取`require('xxx')`
    if (factory.length) {
      factory
        .toString()
        .replace(commentRegExp, '')
        .replace(cjsRequireRegExp, function(match, quote, dep) {
          deps.push(dep);
        });

      // May be a CommonJS thing even without require calls, but still
      // could use exports, and module. Avoid doing exports and module
      // work though if it just needs require.
      // REQUIRES the function to expect the CommonJS variables in the
      // order listed below.
      deps = (factory.length === 1 ?
        ['require'] : ['require', 'exports', 'module']).concat(deps);
    }
  }

  // 只有当用户自定义的id存在时
  if (id) {
    // 只在开发时报同一id错误 todo 通过工程化工具解决
    // 打包时由于require.async的使用造成层级依赖模块的重复是有可能存在的, 并且S.O.I
    // 也没有很好解决. 当非首屏首页的多个模块又各自依赖或含有第三个非注册过的模块时, 这个
    // 模块会被打包进第二个和第三个package, 这样就有可能在运行时造成同一id多次注册的现象.
    if (cache.mods[id] && kerneljs.debug) {
      emit(events.error, [
        SAME_ID_MSG.replace('%s', id),
        uri
      ]);
      return exist_id_error(id);
    }
    cache.mods[id] = empty_mod;
  }

  // 创建\注册模块
  mod = cache.mods[uid] = new Module({
    uid: uid,
    id: id,
    url: uri,
    deps: deps,
    factory: factory,
    status: Module.STATUS.init
  });

  // 打包过后define会先发生, 这种情况script标签不会带有kn_name字段.
  var name = getCurrentScript().kn_name;
  if (name && isTopLevel(name) && !mod.id) {
    mod.id = name;
  }

  emit(events.create, [mod]);

  // 更新mod.depExports
  mod.resolveDeps();

  // 加载依赖模块
  load(mod);
}

/**
 * 加载依赖模块文件.
 * @param {Object|Module} mod 宿主模块.
 */
function load(mod) {
  var cache = kerneljs.cache,
      count = mod.deps.length,
      inPathConfig = kerneljs.paths && kerneljs.paths[mod.id];

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
 * 一般作为页面逻辑的入口, 提倡js初始化只调用一次require.
 * 函数内部的异步加载用require.async. 两种使用方式:
 * a. var mod = require('widget/a');
 * b. require(['widget/a'], function(wid_a) {
 *      wid_a.init();
 *    });
 * @param {!Array} deps
 * @param {Function?} cb
 */
function require(deps, cb) {
  var argLen = arguments.length;
  // 传入配置对象
  if (typeOf(deps) === 'object' && argLen === 1) {
    kerneljs.config(deps);
    return;
  }

  // 无依赖
  if (typeOf(deps) === 'array' && deps.length === 0) {
    return typeOf(cb) === 'function' ? cb() : cb;
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
      uid: uidprefix + uuid++,
      id: null,
      url: uri,
      deps: deps,
      factory: cb,
      status: Module.STATUS.init
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
  mod.exec();

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
  if (kerneljs.cache.mods[id]) {
    var path = resolvePath(id, (mod && mod.url) || getCurrentScriptPath());
    var cacheMod = kerneljs.cache.mods[id] ||
        kerneljs.cache.mods[kerneljs.cache.path2uid[path][0]];
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
  require([id], callback);
};

/**
 * define.amd property, conforms to the AMD API.
 * @typedef {Object}
 */
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};
