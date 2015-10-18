
// A regexp to filter `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// A regexp to drop comments in source code
    commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// initialize a module
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
 * if a module with in the same id exists, then define with the id
 * will fail. we throw an error with useful message.
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
  var base = getCurrentPath();

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

  // 只有当用户自定义的id存在时才会被缓存到id2path.
  if (id) {
    // 只在开发时报同一id错误
    // 打包时由于require.async的使用造成层级依赖模块的重复是有可能存在的, 并且S.O.I
    // 也没有很好解决. 当非首屏首页的多个模块又各自依赖或含有第三个非注册过的模块时, 这个
    // 模块会被打包进第二个和第三个package, 这样就有可能在运行时造成同一id多次注册的现象.
    if (cache.id2path[id] && kerneljs.debug) {
      kerneljs.trigger(kerneljs.events.ERROR, [
        SAME_ID_MSG.replace('%s', id),
        base
      ]);
      return exist_id_error(id);
    }
    cache.id2path[id] = base;
    cache.mods[id] = empty_mod;
  }

  // 缓存path2uid
  if (cache.path2uid[base]) {
    cache.path2uid[base].push(uid);
  } else {
    cache.path2uid[base] = [uid];
  }

  // 注册模块
  mod = cache.mods[uid] = empty_mod;

  // If no name, and factory is a function, then figure out if it a
  // CommonJS thing with dependencies.
  // Code below in the if-else statements lent from RequireJS
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

  // 创建模块
  mod = cache.mods[uid] = new Module({
    uid: uid,
    id: id,
    url: base,
    deps: deps,
    factory: factory,
    status: Module.STATUS.init
  });
  kerneljs.trigger(kerneljs.events.create, [mod]);

  // 打包过后define会先发生, 这种情况script标签不会带有kernel_name字段.
  var name = getCurrentScript().kernel_name;
  if (name && isTopLevel(name) && !mod.id) {
    mod.id = name;
  }

  // fill exports list to depMods
  if (mod.deps && mod.deps.length > 0) {
    mod.deps = map(mod.deps, function(dep, index) {
      if (dep === 'exports' || dep === 'module') {
        mod.cjsWrapper = true;
      }

      var inject = resolve(dep, mod);
      if (inject) {
        mod.depMods[index] = inject;
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
  var cache = kerneljs.cache;
  var count = mod.deps.length;
  var inPathConfig = kerneljs.paths && kerneljs.paths[mod.id] ? true : false;
  // 若mod.id在paths中已经配置则相对路径是location.href,
  // 详见: config_path_relative test case.
  var currentPath = inPathConfig ? loc.href : getCurrentPath();

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
    if (mod.depMods[index]) {
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
      mod.depMods[index] = cache.mods[uid[0]].exports;

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
 * define.amd property
 *
 * To allow a clear indicator that a global define function
 * (as needed for script src browser loading) conforms to the AMD API,
 * any global define function SHOULD have a property called "amd" whose
 * value is an object. This helps avoid conflict with any other existing
 * JavaScript code that could have defined a define() function that
 * does not conform to the AMD API.
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
