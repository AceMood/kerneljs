
/**
 * load all dependencies of mod.
 * @param {Object} mod
 */
function load(mod) {
    var cache = kernel.cache;
    var count = mod.deps.length;

    // record in fetchingList
    fetchingList.add(mod);

    // update mod's status
    mod.status = Module.STATUS.fetching;

    // register module in global cache with an empty
    // export for later checking if its status is available.
    if (!cache.mods[mod.uid]) cache.mods[mod.uid]= empty_mod;

    forEach(mod.deps, function(dep, index) {
        // after resolving, built-in module and existed modules are
        // available. it's useful after static analyze and combo files
        // into one js file.
        // so check if an object first of all.
        if (mod.depMods[index]) {
            --count;
            return;
        }
        // else it's a real file path. get its responding uid
        var uid = cache.path2uid[dep];
        // file has been fetched
        if (uid) {
            --count;
            mod.depMods[index] = cache.mods[uid[0]].exports;
        // it's a user-defined or not been fetched file.
        // if it's a user-defined id and not config in global
        // alias, it will produce a 404 error.
        } else {
            // record this mod depend on the dep current now.
            if (dependencyList[dep])
                dependencyList[dep].push(mod);
            else
                dependencyList[dep] = [mod];

            if (!sendingList[dep]) {
                sendingList[dep] = true;
                fetch(dep);
            }
        }
    });

    // if all deps module have been cached
    // In notify, mod will be removed from fetchingList
    count == 0 && notify(mod);
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
    if (typeOf(deps) == "object" && !cb) {
        kernel.config(deps);
        return;
    }

    if (deps.length == 0 && cb) return cb();

    // Type conversion
    // it's a single module dependency and no callback
    if (typeOf(deps) == "string") deps = [deps];

    // Each item of deps have been resolved.
    // But there has two conditions after resolved:
    //   a. path is a real file path
    //   b. path is a unique user-defined id
    // for the second condition, we must look into the
    // kernel.alias, if user not config the mapping path
    // for id-path in alias, then we do not know what the
    // id stand for in load function.
    // So we expect all deps resolved to a real file path
    // here.
    deps = map(deps, function(dep) {
        // it's not allowed to require 'require', 'module' &
        // 'exports' as arguments. so resolveId directly.
        return resolveId(dep, getCurrentPath());
    });

    var uid;
    if (cb) {
        // require may introduce an anonymous module,
        // it has the unique uid and id is empty string;
        uid = kernel.uidprefix + kernel.uid++;
        var mod = new Module({
            uid: uid,
            id: null,
            url: null,
            deps: deps,
            factory: cb,
            status: Module.STATUS.uninit
        });
        mod.depMods = map(deps, function(dep) {
            return resolve(dep);
        });

        load(mod);
    } else {
        // a simple require statements always be resolved preload.
        // so if length == 1 then return its exports object.
        var _mod = resolve(deps[0]);
        if (deps.length == 1 && _mod)
            return _mod;
        else {
            uid = kernel.cache.path2uid[deps[0]][0];
            return kernel.cache.mods[uid].exports || null;
        }
    }
}


/**
 * when a module prepared, mean all its dependencies have already
 * resolved and its factory has evaluated. notify all other modules
 * depend on it
 * @param {Module} mod
 */
function notify(mod) {
    fetchingList.remove(mod);
    // amd
    if (!mod.cjsWrapper)
        mod.exports = typeOf(mod.factory) == "object" ?
            mod.factory : (mod.factory.apply(null, mod.depMods) || {});
    // cmd
    else
        mod.factory.apply(null, mod.depMods);

    mod.status = Module.STATUS.complete;
    // register module in global cache
    kernel.cache.mods[mod.uid] = mod;
    if (mod.id) {
        kernel.cache.mods[mod.id] = mod;
    }
    // dispatch ready event
    // all other modules recorded in dependencyList depend on this mod
    // will execute their factories in order.
    var depandants = dependencyList[mod.url];
    if (depandants) {
        // here I first delete it because a complex condition:
        // if a define occurs in a factory function, and the module whose
        // factory function is current executing, it's a callback executing.
        // which means the currentScript would be mod just been fetched successfully.
        // the url would be the previous one. and we store the record in global cache
        // dependencyList. SO we must delete it first to avoid the factory function
        // execute twice.
        delete dependencyList[mod.url];
        forEach(depandants, function(dependant) {
            if (dependant.ready && dependant.status == Module.STATUS.fetching)
                dependant.ready(mod);
        });
    }
}


/**
 * Resolve path of the given id.
 * @param {String} id
 * @return {!(String|Object)}
 */
require.toUrl = function(id) {
    return resolveId(id);
};
