
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
  var mod, cache = kerneljs.cache,
      uid = kerneljs.uidprefix + kerneljs.uid++;

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
    // Remove comments from the callback string,
    // look for require calls, and pull them into the dependencies,
    // but only if there are function args.
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
      kerneljs.trigger(kerneljs.events.error, [
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
  kerneljs.trigger(kerneljs.events.create, [mod]);

  // 打包过后define会先发生, 这种情况script标签不会带有kn_name字段.
  var name = getCurrentScript().kn_name;
  if (name && isTopLevel(name) && !mod.id) {
    mod.id = name;
  }

  // 更新mod.depExports
  if (mod.deps && mod.deps.length > 0) {
    mod.deps = map(mod.deps, function(dep, index) {
      if (/^(exports|module)$/.test(dep)) {
        mod.cjsWrapper = true;
      }

      var inject = resolve(dep, mod);
      if (inject) {
        mod.depExports[index] = inject;
      }
      return dep;
    });
  }

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
      inPathConfig = kerneljs.paths && kerneljs.paths[mod.id] ? true : false;

  // 若mod.id在paths中已经配置则相对路径是location.href,
  // 详见: config_path_relative test case.
  var currentPath = inPathConfig ? loc.href : (mod.url || getCurrentScriptPath());

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
    // After resolving, built-in module and existed modules are
    // available. it's useful after static analyze and combo files
    // into one js file.
    // so check if an object first of all.
    if (mod.depExports[index]) {
      --count;
      return;
    }

    // else it's a real file path. get its responding uid
    var path = resolvePath(name, currentPath);
    var uid = cache.path2uid[path];

    // File has been fetched, but its deps may not being fetched yet,
    // so its status is 'fetching' now.
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (uid && cache.mods[uid[0]] &&
      (cache.mods[uid[0]].status === Module.STATUS.complete ||
        checkCycle(path, mod))) {
      --count;
      mod.depExports[index] = cache.mods[uid[0]].exports;

      // It's a user-defined or not been fetched file.
      // If it's a user-defined id and not config in global alias,
      // it will produce a 404 error.
    } else {
      // record this mod depend on the dep current now.
      if (!dependencyList[path]) {
        dependencyList[path] = [mod];
      } else if (indexOf(dependencyList[path], mod) < 0) {
        dependencyList[path].push(mod);
      }

      if (!sendingList[path]) {
        sendingList[path] = true;
        // script or link insertion
        fetch(path, name);
      }
    }
  });

  // If all module have been cached.
  // In notify, mod will be removed from fetchingList
  if (count === 0) {
    notify(mod);
  }
}

/**
 * define.amd property, conforms to the AMD API.
 *
 * The properties inside the define.amd object are not specified at this time.
 * It can be used by implementers who want to inform of other capabilities
 * beyond the basic API that the implementation supports.
 *
 * Existence of the define.amd property with an object value indicates
 * conformance with this API. If there is another version of the API,
 * it will likely define another property, like define.amd2, to indicate
 * implementations that conform to that version of the API.
 *
 * An example of how it may be defined for an implementation that allows
 * loading more than one version of a module in an environment:
 *
 * @typedef {Object}
 */
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};

/**
 * 一般作为页面逻辑的入口, 提倡js初始化只调用一次require.
 * 函数内部的异步加载用require.async. 两种使用方式:
 * a. var mod = require('widget/a');
 * b. require(['widget/a'], function(wid_a) {
 *      wid_a.init();
 *    });
 * @param {!Array|String} deps
 * @param {Function?} cb
 */
function require(deps, cb) {
  // 传入配置对象
  if (typeOf(deps) === 'object' && !cb) {
    kerneljs.config(deps);
    return null;
  }
  // 无依赖
  if (typeOf(deps) === 'array' && deps.length === 0) {
    if (typeOf(cb) === 'function') {
      return cb();
    } else {
      return cb;
    }
  }

  // 如果只依赖一个模块则转化成数组.
  // var isCss;
  if (typeOf(deps) === 'string') {
    isCss = (deps.indexOf('.css') === deps.length - 4);
    deps = [deps];
  }

  if (isCss && deps.length === 1) {
    return {};
  }

  var uid, mod,
      uri = getCurrentScriptPath();

  if (cb) {
    // 为`require`的调用生成一个匿名模块,
    // it has the unique uid and id is null.
    uid = kerneljs.uidprefix + kerneljs.uid++;
    mod = new Module({
      uid: uid,
      id: null,
      url: uri,
      deps: deps,
      factory: cb,
      status: Module.STATUS.init
    });

    // convert dependency names to an object Array, of course,
    // if any rely module's export haven't resolved, use the
    // default name replace it.
    mod.depExports = map(deps, function(dep) {
      // 得到依赖的绝对路径
      var path = resolvePath(dep, uri);
      return resolve(dep) || resolve(path);
    });

    load(mod);
    return null;

  } else {
    var need = resolvePath(deps[0], uri);
    // a simple require statements always be resolved preload.
    // so if length == 1 then return its exports object.
    mod = resolve(deps[0]);
    if (deps.length === 1 && mod) {
      return mod;
    } else {
      uid = kerneljs.cache.path2uid[need][0];
      return kerneljs.cache.mods[uid].exports || null;
    }
  }
}

/**
 * Whenever a module is prepared, means all its dependencies have already
 * been fetched and its factory function has executed. So notify all other
 * modules depend on it.
 * @param {Module} mod
 */
function notify(mod) {
  fetchingList.remove(mod);

  // amd
  if (!mod.cjsWrapper) {
    mod.exports = typeOf(mod.factory) === 'function' ?
        mod.factory.apply(null, mod.depExports) : mod.factory;
  }
  // cmd
  else {
    mod.factory.apply(null, mod.depExports);
  }

  if (isNull(mod.exports)) {
    mod.exports = {};
  }

  mod.setStatus(Module.STATUS.complete);

  // Register module in global cache
  kerneljs.cache.mods[mod.uid] = mod;
  // two keys are the same thing
  if (mod.id) {
    kerneljs.cache.mods[mod.id] = mod;
  }

  // Dispatch ready event.
  // All other modules recorded in dependencyList depend on this mod
  // will execute their factories by order.
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
 * @param {String} name
 * @param {Module} mod Pass-in this argument is to used in a cjs
 *   wrapper form, if not we could not refer the module and exports
 * @return {Object}
 */
function resolve(name, mod) {
  // step 1: parse built-in and already existed modules
  if (kerneljs.cache.mods[name]) {
    var currentScriptPath = getCurrentScriptPath(),
        path = resolvePath(name, currentScriptPath);
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (kerneljs.cache.mods[name].status === Module.STATUS.complete ||
        checkCycle(path, mod)) {
      return kerneljs.cache.mods[name].exports;
    }
  }

  // step 2: cjs-wrapper form
  if (name === 'require') {
    return require;
  } else if (name === 'module') {
    return mod;
  } else if (name === 'exports') {
    return mod && mod.exports;
  }

  return null;
}

/**
 * A mechanism to check cycle reference.
 * More about cycle reference can be solved by design pattern, and a
 * well-designed API(Architecture) can avoid this problem, but in case
 * it happened, we do the same thing for dojo loader and specification
 * written on RequireJS website. See:
 *  'http://requirejs.org/docs/api.html#circular'
 *   and
 *  'http://dojotoolkit.org/documentation/tutorials/1.9/modules_advanced/'
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
 * Used to Load module after page loaded.
 * @param {!String} id Identifier or path to module.
 * @param {!Function} callback Factory function.
 */
require.async = function(id, callback) {
  require([id], callback);
};
