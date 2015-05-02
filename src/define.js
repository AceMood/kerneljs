
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


/**
 * 全局define函数. 函数签名:
 * define(id?, dependencies?, factory);
 * 见: https://github.com/amdjs/amdjs-api/blob/master/AMD.md#define-function-
 * @param {String|Array|Function|Object} id
 * @param {Array|Function|Object} deps
 * @param {(Function|Object)?} factory
 */
define = _def = function(id, deps, factory) {
  var mod, cache = kerneljs.cache,
    uid = kerneljs.uidprefix + kerneljs.uid++;

  // document.currentScript stuned me in a callback and
  // event handler conditions.
  // but if define in a single file, this could be trusted.
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

  // Only when user-defined id presents, we record it in id2path cache.
  // First check module with the same id.
  //
  // Note: after build, in require.async conditions, we could not
  // know which module will be loaded first if more than two modules
  // need a non-registered 3rd module. So the 3rd will be compiled
  // into package 2 and package 3 together, which means define with same
  // identifier will be called twice.
  if (id) {
    if (cache.id2path[id] && kerneljs.debug) {
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

  // register module in global cache
  mod = cache.mods[uid] = empty_mod;

  // If no name, and factory is a function, then figure out if it a
  // CommonJS thing with dependencies. I don't intend to support it.
  // But many projects used RequireJS may depend on this functional.
  // Code below in the if-else statements lent from RequireJS
  if (!deps && typeOf(factory) === 'function') {
    deps = [];
    // Remove comments from the callback string,
    // look for require calls, and pull them into the dependencies,
    // but only if there are function args.
    if (factory.length) {
      factory
        .toString()
        .replace(commentRegExp, "")
        .replace(cjsRequireRegExp, function(match, quote, dep) {
          deps.push(dep);
        });

      // May be a CommonJS thing even without require calls, but still
      // could use exports, and module. Avoid doing exports and module
      // work though if it just needs require.
      // REQUIRES the function to expect the CommonJS variables in the
      // order listed below.
      deps = (factory.length === 1 ?
        ["require"] : ["require", "exports", "module"]).concat(deps);
    }
  }

  // 创建模块
  mod = cache.mods[uid] = new Module({
    uid: uid,
    id: id,
    url: base,
    deps: deps,
    factory: factory,
    status: Module.STATUS.uninit
  });

  // if in a concatenate file define will occur first,
  // there would be no kernel_name here.
  var name = getCurrentScript().kernel_name;
  if (name && isTopLevel(name) && !mod.id) {
    mod.id = name;
  }

  // fill exports list to depMods
  if (mod.deps && mod.deps.length > 0) {
    mod.deps = map(mod.deps, function(dep, index) {
      if (dep === "exports" || dep === "module") {
        mod.cjsWrapper = true;
      }

      var inject = resolve(dep, mod);
      if (inject) {
        mod.depMods[index] = inject;
      }
      return dep;
    });
  }

  // load dependencies.
  load(mod);
};


/**
 * Load all dependencies of a specific module.
 * @param {Object|Module} mod Whose deps to be fetched.
 */
function load(mod) {

  var cache = kerneljs.cache;
  var count = mod.deps.length;
  var inPathConfig = kerneljs.paths && kerneljs.paths[mod.id] ? true : false;
  // todo I doubt about the uri in paths config and all its rel path
  // will be resolved relative to location.href, See
  // test case: config_path_relative for more information.
  var currentPath = inPathConfig ? loc.href : getCurrentPath();

  // Record in fetchingList to represent the module is now
  // fetching its dependencies.
  fetchingList.add(mod);

  // Update mod's status
  mod.status = Module.STATUS.fetching;

  // Register module in global cache with an empty.
  // export for later checking if its status is available.
  if (!cache.mods[mod.uid]) {
    cache.mods[mod.uid] = empty_mod;
  }

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
    var path = resolveId(name, currentPath);
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
        // script insertion
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
