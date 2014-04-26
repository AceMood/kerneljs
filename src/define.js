
// A regexp to filter `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// A regexp to drop comments in source code
    commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;


/**
 * define a module.
 * The specification defines a single function "define" that is available
 * as a free variable or a global variable. The signature of the function:
 * define(id?, dependencies?, factory);
 *
 * @param {String|Array|Function|Object} id
 * @param {Array|Function|Object} deps
 * @param {(Function|Object)?} factory
 */
function define(id, deps, factory) {
    var mod,
        cache = kernel.cache,
        uid = kernel.uidprefix + kernel.uid++;

    // todo: document.currentScript stuned me
    var base = getCurrentPath();

    // deal with optional arguments
    if (typeOf(id) != "string") {
        factory = deps;
        deps = id;
        id = null;
    }

    if (typeOf(deps) != "array") {
        factory = deps;
        deps = null;
    }

    // only when user-defined id presents, we record it
    // in id2path cache. First check module with the same id.
    if (id) {
        if (cache.id2path[id]) {
            exist_id_error(id);
            return;
        }
        cache.id2path[id] = base;
        cache.mods[id] = empty_mod;
    }

    // record
    if (cache.path2uid[base])
        cache.path2uid[base].push(uid);
    else
        cache.path2uid[base] = [uid];

    // register module in global cache
    mod = cache.mods[uid] = empty_mod;

    // If no name, and factory is a function, then figure out if it a
    // CommonJS thing with dependencies. I don't intend to support it.
    // But many projects used RequireJS may depend on this functionality.
    // Code below in the if-else statements lent from RequireJS
    if (!deps && typeOf(factory) == "function") {
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
            deps = (factory.length === 1 ? ["require"] : ["require", "exports", "module"]).concat(deps);
        }
    }

    mod = cache.mods[uid] = new Module({
        uid: uid,
        id: id,
        url: base,
        deps: deps,
        factory: factory,
        status: Module.STATUS.uninit
    });

    // resolve paths
    if (mod.deps) {
        mod.deps = map(mod.deps, function(dep, index) {
            if (dep == "exports" || dep == "module")
                mod.cjsWrapper = true;
            var inject = resolve(dep, mod);
            if (inject) mod.depMods[index] = inject;
            return resolveId(dep, base);
        });
    }

    load(mod);
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
 * @type {Object}
 */
define.amd = {
    creator: "AceMood",
    email: "zmike86@gmail.com",
    version: "1.0"
};


/**
 * Used in the CommonJS wrapper form of define a module.
 * @param {Array} dep
 * @param {Module} mod
 * @return {Object}
 */
function resolve(dep, mod) {
    // step 1: parse built-in and already existed modules
    if (kernel.builtin[dep]) {
        var uid, ret;
        switch (dep) {
            case "module":
                uid = kernel.cache.path2uid[base][0];
                ret = kernel.cache.mods[uid];
                break;
            case "exports":
                uid = kernel.cache.path2uid[base][0];
                ret = kernel.cache.mods[uid].exports;
                break;
        }
        return ret || kernel.builtin[dep];
    }
    if (kernel.cache.mods[dep]) return kernel.cache.mods[dep].exports;

    // step 2: cjs-wrapper form
    if (dep == "require") return require;
    else if (dep == "module") return mod;
    else if (dep == "exports") return mod && mod.exports;

    return null;
}
