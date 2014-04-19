
function noop() {}


/**
 * @constructor
 */
function Module(obj) {
    this.uid = obj.uid;
    this.id = obj.id || null;
    this.url = obj.url;
    this.deps = obj.deps || resolveRequireInternal();
    this.status = obj.status || Module.STATUS.uninit;
    this.factory = obj.factory || noop;
    this.exports = null;
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
                this.deps[i] = mod.exports;
                break;
            }
        }
    }
    if (this.checkAllDepsOK()) {
        notify(this);
    }
};


/**
 * check if all mod's deps have been ready
 */
Module.prototype.checkAllDepsOK = function() {
    var ok = true;
    forEach(this.deps, function(dep) {
        if (typeOf(dep) == "string") {
            ok = false;
            return break_obj;
        }
    });
    return ok;
};


Module.create = function () {

};
