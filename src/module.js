
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
        if (kernel.paths && kernel.paths[this.id])
            var inPathConfig = true;
        for(var i = 0; i < this.deps.length; ++i) {
            var path = resolveId(this.deps[i], inPathConfig ? loc.href : this.url);
            if (path === mod.url) {
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
    // I do not use forEach here because native forEach will
    // pass through all values are undefined, so it will introduce
    // some tricky results.
    for(var i= 0; i < this.depMods.length; ++i) {
        if (typeOf(this.depMods[i]) == "undefined" ||
            typeOf(this.depMods[i]) == "null") {
            ok = false;
            break;
        }
    }
    return ok;
};
