
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
        if (typeOf(dep) != "string") {
            --count;
            return;
        }
        // else it's a real file path. get its responding uid
        // var uid = cache.path2uid[dep];
        // file has been fetched
        // if (uid) {
        //     --count;
        //     mod.deps[index] = cache.mods[uid].exports;
        // it's a user-defined or not been fetched file.
        // if it's a user-defined id and not config in global
        // alias, it will produce a 404 error.
        // } else {
            // record this mod depend on the dep current now.
            if (dependencyList[dep])
                dependencyList[dep].push(mod);
            else
                dependencyList[dep] = [mod];
            fetch(dep);
        // }
    });

    // if all deps module have been cached
    // In notify, mod will be removed from fetchingList
    count == 0 && notify(mod);
}


/**
 * set up page logic or manually request a module asynchronously.
 * @param {!Array} deps
 * @param {Function?} cb
 */
function require(deps, cb) {
    if (deps.length == 0) {
        cb && cb();
        return;
    }

    // Each item of deps have been resolved.
    // But there has two conditions after resolved:
    // a. path is a real file path
    // b. path is a unique user-defined id
    // for the second condition, we must look into the
    // kernel.alias, if user not config the mapping path
    // for id-path in alias, then we do not know what the
    // id stand for in load function.
    // So we expect all deps resolved to a real file path
    // here.
    deps = map(deps, function(dep) {
        return resolve(dep, getCurrentPath());
    });

    // require may introduce an anonymous module,
    // it has the unique uid and id is empty string;
    var uid = kernel.uidprefix + kernel.uid++;
    var mod = new Module({
        uid: uid,
        id: "",
        url: "",
        deps: deps,
        factory: cb,
        status: Module.STATUS.uninit
    });

    load(mod);
}
