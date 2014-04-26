/**
 * author: AceMood
 * Email: zmike86@gmail.com
 */

/**
 * ==================================================================
 * browser code in development
 *
 * The Asynchronous Module Definition (AMD) API specifies a mechanism
 * for defining modules such that the module and its dependencies can
 * be asynchronously loaded. This is particularly well suited for the
 * browser environment where synchronous loading of modules incurs
 * performance, usability, debugging, and cross-domain access problems.
 *
 * ==================================================================
 * compiled for production in browser
 *
 *
 * See for more:
 * "https://github.com/amdjs/amdjs-api/wiki/AMD"
 *
 */

(function (global, undefined) {

"use strict";


// store useful props
var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    native_map = AP.map,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;


// use such an object to determine cut down a forEach loop;
var break_obj = {};


// initialize a module
var empty_mod = {
    id: null,
    uid: null,
    url: null,
    status: null,
    exports: {}
};


// for no-op function, used for a default callback function
function noop() {}


/**
 * if a module with in the same id exists, then define with the id
 * will fail. we throw an error with useful message.
 */
function exist_id_error(id) {
    throw "more then one module defined with the same id: " + id;
}


/**
 * iterate the array and map the value to a delegation
 * function, use the return value replace original item.
 * @param {Array} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 * @return {!Array}
 */
function map(arr, fn, opt_context) {
    var ret = [];
    if (native_map && arr.map === native_map) {
        ret = arr.map(fn, opt_context)
    } else if (arr.length === +arr.length) {
        for (var i = 0; i < arr.length; ++i) {
            ret.push(fn.call(opt_context || null, arr[i], i, arr))
        }
    }
    return ret;
}


/**
 * ECMA-262 described:
 * 15.4.4.18 Array.prototype.forEach ( callbackfn [ , thisArg ] )
 * callbackfn should be a function that accepts three arguments.
 * forEach calls callbackfn once for each element present in the array,
 * in ascending order. callbackfn is called only for elements of the array
 * which actually exist; it is not called for missing elements of the array.
 * If a thisArg parameter is provided, it will be used as the this value
 * for each invocation of callbackfn. If it is not provided, undefined is used instead.
 * callbackfn is called with three arguments: the value of the element,
 * the index of the element, and the object being traversed.
 * forEach does not directly mutate the object on which it is called
 * but the object may be mutated by the calls to callbackfn.
 * The range of elements processed by forEach is set before the first call to callbackfn.
 * Elements which are appended to the array after the call to forEach begins will not
 * be visited by callbackfn. If existing elements of the array are changed, their value
 * as passed to callback will be the value at the time forEach visits them;
 * elements that are deleted after the call to forEach begins and before being visited are not visited.
 * When the forEach method is called with one or two arguments, the following steps are taken:
 * 1. Let O be the result of calling ToObject passing the this value as the argument.
 * 2. Let lenValue be the result of calling the [[Get]] internal method of O with the argument "length".
 * 3. Let len be ToUint32(lenValue).
 * 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
 * 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
 * 6. Let k be 0.
 * 7. Repeat, while k < len
 *  a. Let Pk be ToString(k).
 *  b. Let kPresent be the result of calling the [[HasProperty]] internal method of O with argument Pk.
 *  c. If kPresent is true, then
 *      i. Let kValue be the result of calling the [[Get]] internal method of O with argument Pk.
 *      ii. Call the [[Call]] internal method of callbackfn with T as the this value and argument list
 *          containing kValue, k, and O.
 *  d. Increase k by 1.
 * 8. Return undefined.
 * The length property of the forEach method is 1.
 * NOTE The forEach function is intentionally generic; it does not require that
 * its this value be an Array object. Therefore it can be transferred to other kinds of objects
 * for use as a method. Whether the forEach function can be applied successfully to a host object
 * is implementation-dependent.
 *
 * @param {Array} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 */
function forEach(arr, fn, opt_context) {
    if (native_forEach && arr.forEach === native_forEach) {
        arr.forEach(fn, opt_context);
    } else if (arr.length === +arr.length) {
        for (var i = 0, length = arr.length; i < length; i++) {
            if (fn.call(opt_context, arr[i], i, arr) === break_obj)
                break;
        }
    }
}


/**
 * find a target in an array, return the index or return -1;
 * @param {Array} arr
 * @param {*} tar
 * @return {Number}
 */
function indexOf(arr, tar) {
    for (var i = 0; i < arr.length; ++i) {
        if (arr[i] === tar)
            return i;
    }
    return -1;
}


var type_map = {
    "[object Object]": "object",
    "[object Array]" : "array",
    "[object Function]": "function",
    "[object RegExp]": "regexp",
    "[object Null]"  : "null",
    "[object Undefined]" : "undefined",
    "[object String]": "string",
    "[object Number]": "number"
};


/**
 * detect the obj's type
 */
function typeOf(obj) {
    return type_map[toString.call(obj)]
}


var doc = document,
    head = doc.head || doc.getElementsByTagName("head")[0],
// It's a classical bug in IE6 found in jQuery.
// see more: 'http://dev.jquery.com/ticket/2709'
    $base = doc.getElementsByTagName("base")[0];


if ($base) {
    head = $base.parentNode;
}


// current adding script node
var currentAddingScript,
// In older FF, do not support script.readyState, so we only use this prop in IEs.
    useInteractive = false,
// loop all script nodes in doc, if one's readyState is 'interactive'
// means it's now executing;
    interactiveScript;


/**
 * load a module through a dynamic script insertion.
 * once confirm the module loaded and executed, then update
 * cache's info and exec module's factory function.
 * @param {!String} url File path to fetch.
 */
function fetch(url) {
    var script = doc.createElement("script");
    script.charset = "utf-8";
    script.async = true;

    // Although 'onload' in IE9 & IE10 have problems, but I do not
    // care the issure, and whatever async is true or false. We just
    // remove node in document as the callback of javascript loaded.
    // Read more about the bug:
    // 'https://connect.microsoft.com/IE/feedback/details/729164/'
    // + 'ie10-dynamic-script-element-fires-loaded-readystate-prematurely'
    // 'https://connect.microsoft.com/IE/feedback/details/648057/'
    // + 'script-onload-event-is-not-fired-immediately-after-script-execution'
    if ('readyState' in script) {
        useInteractive = true;
    }

    // Event binding
    script.onreadystatechange = script.onload = script.onerror = function () {
        script.onreadystatschange = script.onload = script.onerror = null;
        interactiveScript = null;
        if (!script.readyState || /complete/.test(script.readyState)) {
            head.removeChild(script);
        }
    };

    // Older IEs will request the js file once src has been set,
    // then readyState will be "loaded" if script complete loading,
    // but change to "complete" after the code executed.
    script.src = url;
    currentAddingScript = script;
    if ($base) {
        head.insertBefore(script, $base);
    } else {
        head.appendChild(script);
    }
    currentAddingScript = null;
}


/**
 * get all script nodes in document at present
 * @return {NodeList}
 */
function scripts() {
    return doc.getElementsByTagName("script");
}


/**
 * get current executing script
 * @return {*}
 */
function getCurrentScript() {
    // It's important to note that this will not reference the <script> element
    // if the code in the script is being called as a callback or event handler;
    // it will only reference the element while it's initially being processed.
    // Read more:
    //   'https://developer.mozilla.org/en-US/docs/Web/API/document.currentScript'
    return doc.currentScript || currentAddingScript || (function() {
        var _scripts;
        if (useInteractive) {
            if (interactiveScript && interactiveScript.readyState == "interactive")
                return interactiveScript;

            _scripts = scripts();
            forEach(_scripts, function(script) {
                if (script.readyState == "interactive") {
                    interactiveScript = script;
                    return break_obj;
                }
            });
            return interactiveScript;
        }
        // todo in FF early version
        return null;
    })();
}


/**
 * Retrieve the current executing script node's
 * absolute path.
 * @return {*|string}
 */
function getCurrentPath() {
    var node = getCurrentScript();
    return node && node.getAttribute("src", 4);
}


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


// @global
var kernel = {};


// preserve existed kernel object;
if (global.kernel) {
    kernel._kernel = global.kernel;
}


// universal global module id
kernel.uid = 0;
kernel.uidprefix = "kernel_";


// all modules being fetched means the module's dependencies
// is now fetching, and the key is mod's uid, value is mod itself;
var fetchingList = {
    mods: {},
    add: function(mod) {
        if (this.mods[mod.uid])
            throw "current mod with uid: " + mod.uid +
                " and file path: " + mod.url + " is fetching now";
        this.mods[mod.uid] = mod;
    },
    clear: function() {
        this.mods = null;
        this.mods = {};
    },
    remove: function(mod) {
        if (this.mods[mod.uid]) {
            this.mods[mod.uid] = null;
            delete this.mods[mod.uid];
        }
    }
};


// if requiring a module, then record it here. So that once the
// module complete, notify all its dependants.
// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here,
// the hash will be path -> [mod] constructor.
var dependencyList = {};


// if a module a fetching now means the corresponding script is loading now,
// before it complete loaded, we should not fetch it twice, but only when
// define the module it would record in the 'cache.path2uid', so here we just
// record here to avoid fetch twice.
// the hash will be path -> bool constructor.
var sendingList = {};


/**
 * dynamic config kernel.
 * property of obj can be:
 * [alias]: a collection of short names will be used to stand for 
 *     a long name or long path module.
 * [map]: a hash 
 * [baseUri]:   
 */
kernel.config = function(obj) {
    if (typeOf(obj) != "object")
        throw "config object must an object";
    var key, k;
    for (key in obj) {
        if (hasOwn.call(obj, key)) {
            if (kernel[key]) {
                for (k in obj[key]) {
                    kernel[key][k] = obj[key][k];
                }
            } else
                kernel[key] = obj[key];
        }
    }
};


// global cache.
kernel.cache = {
    // use a global cache to store uid-module pairs.
    // each uid mapping to a unique module, so it's a
    // one-to-one hash constructor.
    mods: {},
    // and id2path record all module that have a user-defined id.
    // its a pairs; not all modules have user-defined id, so this object
    // if lack of some modules in debug mode;
    // But imagine build, all modules will have self-generated id.
    // It's a one-to-one hash constructor, because a user-defined id
    // can only defined in one file.
    id2path: {},
    // each file may have multiple modules. so it's a one-to-many hash
    // constructor.
    path2uid: {}
};


// default built-in modules
// map the short name and relative path?
kernel.config({
    baseUri: "",
    debug: true,
    alias: {},
    map: {},
    builtin: {
        require: require
    }
});


/**
 * clear all cache.
 */
kernel.reset = function() {
    kernel.cache = {
        mods: {},
        id2path: {},
        path2uid: {}
    };
};


// exports APIs functions
global.require = require;
global.define = define;
global.kernel = kernel;


// and a directory file path must be ends with a slash (back slash in window)
var dirRegExp = /\/$/g,
// whether a path to a file with extension
    fileExtRegExp = /\.(js|css|tpl|txt)$/g;


// retrieve current doc's absolute path
// It may be a file system path, http path
// or other protocol path
var loc = global.location;


/**
 * Normalize a string path, taking care of '..' and '.' parts.
 * This method perform identically with node path.normalize.
 *
 * When multiple slashes are found, they're replaced by a single one;
 * when the path contains a trailing slash, it is preserved.
 * On Windows backslashes are used in FileSystem.
 *
 * Example:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} p
 */
function normalize(p) {
    // step1: combine multi slashes
    p = p.replace(/(\/)+/g, "/");

    // step2: resolve '.' and '..'
    p = resolveDot(p);
    return p;
}


/**
 * resolve a path with a '.' or '..' part in it.
 * @param {string} p
 * @return {string}
 */
function resolveDot(p) {
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
    p = p.split("/");
    for (var i = 0; i < p.length; ++i) {
        if (p[i] == ".") {
            p.splice(i, 1);
            --i;
        } else if (p[i] == ".." && i > 0 && p[i - 1] != "..") {
            p.splice(i - 1, 2);
            i -= 2;
        }
    }
    return p.join("/");
}


/**
 * To get current doc's directory
 * @return {string}
 */
function getPageDir() {
    return dirname(loc.href);
}


/**
 * Judge if a path is top-level, such as 'core/class.js'
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isTopLevel(p) {
    return isRelative(p) && p[0] != ".";
}


/**
 * Return if a path is absolute.
 * In most web environment, absolute url starts with a 'http://' or 'https://';
 * In Windows File System, starts with a 'file:///' protocol;
 * In UNIX like System, starts with a single '/';
 *
 * @param {string} p Path to check.
 * @return {boolean} b Is p absolute?
 */
function isAbsolute(p) {
    return /:\/\//.test(p) || /^\//.test(p);
}


/**
 * Return if a path is relative.
 * In most web environment, relative path start with a single/double dot.
 * e.g: ../a/b/c; ./a/b
 *
 * Here we think topLevel path is a kind of relative path.
 *
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isRelative(p) {
    return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p[0] !== "/");
}


/**
 * Map the identifier for a module to a Internet file
 * path. SCRIPT insertion will set path with it.
 *
 * @param {string} id Always the module's identifier.
 * @param {string?} base A relative baseuri for resolve the
 *   module's absolute file path.
 * @return {!(string|object)} exports object or absolute file path from Internet
 */
function resolveId(id, base) {
    var _mod = kernel.cache.mods[id];
    if (id == "require" || id == "module" ||
        id == "exports" || (_mod &&  _mod != empty_mod))
        return id;

	// step 1: normalize id and parse head part as alias
    if (isTopLevel(id)) {
        id = parseAlias(id);
        // here if a top-level path then relative base change to
        // current document's baseUri.
        base = null;
    }
	// step 2: add file extension if necessary
    id = normalize(id);
    var conjuction = id[0] == "/" ? "" : "/";
    var url = (base ? dirname(base) : getPageDir()) + conjuction + id;

    if (!fileExtRegExp.test(url)) url += ".js";

    url = resolveDot(url);

    return url;
}


/**
 * Return the directory name of a path. Similar to the
 * UNIX dirname command.
 *
 * Example:
 * path.dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} p
 * @return {string}
 */
function dirname(p) {
    if (dirRegExp.test(p))
        return p.slice(0, -1);
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
    p = p.split("/");
    p.pop();
    return p.join("/");
}


/**
 * Alias will appear at first word of path.
 * So replace it if exists in kernel.alias.
 * @param {string} p
 * @return {string} s
 */
function parseAlias(p) {
    var parts = p.split("/"),
        part = parts[0];
    if (kernel.alias[part]) {
        part = kernel.alias[part];
    }
    parts.shift();
    return [part].concat(parts).join("/");
}


/**
 * Represents a module.
 * uid is a self-generated global id to identify a unique module.
 * id is a user-defined name for the module, it's a optinal but if we
 *   lost the id property, it will break down some of the test cases
 *   in AMDJS(see anon_circular case), so I change the AMDJS serveral
 *   cases to protect this.
 * url is the file path where to fetch the module.
 * deps is an array to store the dependency module in require or define
 *   form, also it will retrieve the requrie statements in function's
 *   string value in case that a CMD wrapper is used.
 *
 * status is a int value to know the current module state, came from Module.STATUS.
 * factory and exports is the callback function to export the module's value and
 * the real value of the module.
 *
 * @constructor
 */
function Module(obj) {
    this.uid = obj.uid;
    this.id = obj.id || null;
    this.url = obj.url;
    this.deps = obj.deps || [];
    this.depMods = new Array(this.deps.length);
    this.status = obj.status || Module.STATUS.uninit;
    this.factory = obj.factory || noop;
    this.exports = {};
}


// Four states of module.
// 'uninit' module is only inited but without fetching its deps.
// 'fetching' is fetching its deps now but not execute its factory yet.
// 'loaded' is specificated in IE means a js file is loaded.
// 'complete' is module finished resolve and has cached its exports object.
Module.STATUS = {
    "uninit"    : 0,
    "fetching"  : 1,
    "loaded"    : 2,
    "complete"  : 3
};


/**
 * When a mod prepared, then will notify all the modules depend on it.
 * So pass the mod and invoke depandant.ready(mod);
 * @param {Module|Object} mod
 */
Module.prototype.ready = function(mod) {
    if (mod.url) {
        for(var i = 0; i < this.deps.length; ++i) {
            if (this.deps[i] === mod.url) {
                this.depMods[i] = mod.exports;
                break;
            }
        }
    }
    if (this.checkAllDepsOK()) {
        notify(this);
    }
};


/**
 * check if all mod's deps have been ready.
 * Here has a problem. if we do the type checking,
 * the string exports will be filtered, but it's possible
 * that module export an string as a module itself,
 * so we do the
 */
Module.prototype.checkAllDepsOK = function() {
    var ok = true;
    forEach(this.depMods, function(mod) {
        if (typeOf(mod) == "undefined" ||
            typeOf(mod) == "null") {
            ok = false;
            return break_obj;
        }
    });
    return ok;
};

}(this))