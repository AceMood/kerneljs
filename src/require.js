
/**
 * Load all dependencies of a specific module.
 * @param {Object|Module} mod Whose deps to be fetched.
 */
function load(mod) {

  var cache = kernel.cache;
  var count = mod.deps.length;
  var inPathConfig = kernel.paths && kernel.paths[mod.id] ? true : false;
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
 * set up page logic or manually request a module asynchronously.
 * two forms usage:
 * var mod = require("module");
 * or
 * require(["module"], function(module){
 *
 * });
 * @param {!Array|String} deps
 * @param {Function?} cb
 */
function require(deps, cb) {
  // pass-in a config object
  if (typeOf(deps) === "object" && !cb) {
    kernel.config(deps);
    return null;
  }
  // no deps
  if (typeOf(deps) === "array" && deps.length === 0) {
    if (typeOf(cb) === "function") {
      return cb();
    } else {
      return cb;
    }
  }

  // Type conversion
  // it's a single module dependency and with no callback
  if (typeOf(deps) === "string") {
    deps = [deps];
  }

  var uid, _currentPath = getCurrentPath();
  if (cb) {
    // 'require' invoke can introduce an anonymous module,
    // it has the unique uid and id is null.
    uid = kernel.uidprefix + kernel.uid++;
    var mod = new Module({
      uid: uid,
      id: null,
      url: _currentPath,
      deps: deps,
      factory: cb,
      status: Module.STATUS.uninit
    });

    // convert dependency names to an object Array, of course,
    // if any rely module's export haven't resolved, use the
    // default name replace it.
    mod.depMods = map(deps, function(dep) {
      var path = resolveId(dep, _currentPath);
      return resolve(dep) || resolve(path);
    });

    load(mod);
    return null;

  } else {
    var _dep = resolveId(deps[0], _currentPath);
    // a simple require statements always be resolved preload.
    // so if length == 1 then return its exports object.
    var _mod = resolve(deps[0]);
    if (deps.length === 1 && _mod) {
      return _mod;
    } else {
      uid = kernel.cache.path2uid[_dep][0];
      return kernel.cache.mods[uid].exports || null;
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
    mod.exports = typeOf(mod.factory) === "function" ?
      mod.factory.apply(null, mod.depMods) : mod.factory;
  }
  // cmd
  else {
    mod.factory.apply(null, mod.depMods);
  }

  if (isNull(mod.exports)) {
    mod.exports = {};
  }

  mod.status = Module.STATUS.complete;

  // Register module in global cache
  kernel.cache.mods[mod.uid] = mod;
  // two keys are the same thing
  if (mod.id) {
    kernel.cache.mods[mod.id] = mod;
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
 *
 * @return {Object}
 */
function resolve(name, mod) {
  // step 1: parse built-in and already existed modules
  if (kernel.builtin[name]) {
    return kernel.builtin[name];
  }
  if (kernel.cache.mods[name]) {
    var currentPath = getCurrentPath(),
      path = resolveId(name, currentPath);
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (kernel.cache.mods[name].status === Module.STATUS.complete ||
      checkCycle(path, mod)) {
      return kernel.cache.mods[name].exports;
    }
  }


  // step 2: cjs-wrapper form
  if (name === "require") {
    return require;
  }
  else if (name === "module") {
    return mod;
  }
  else if (name === "exports") {
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
  var uid = kernel.cache.path2uid[path];
  var m;
  if (uid && (m = kernel.cache.mods[uid[0]])) {
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
  return resolveId(id);
};


/**
 * Used to Load module after page loaded.
 * @param {!String} id Identifier or path to module.
 * @param {!Function} callback Factory function.
 */
require.async = function(id, callback) {
  require([id], callback);
};


/**
 * For build tool to compile it.
 * Without checking the type of arguments.
 * @param {!String} url
 * @returns {!String}
 */
require.url = function(url) {
  return url;
};
