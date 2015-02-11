
// @global
var kernel = {};


// preserve existed kernel object;
if (global.kernel) {
  kernel._kernel = global.kernel;
}


// universal global module id
kernel.uid = 0;
kernel.uidprefix = "AceMood@kernel_";


// All modules being fetched means the module's dependencies
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
    this.mods = {};
  },
  remove: function(mod) {
    if (this.mods[mod.uid]) {
      this.mods[mod.uid] = null;
      delete this.mods[mod.uid];
    }
  }
};


// If requiring a module, then record it here. So that once the
// module complete, notify all its dependants.
// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here,
// the hash will be path -> [mod] constructor.
var dependencyList = {};


// If a module a fetching now means the corresponding script is loading now,
// before it complete loaded, we should not fetch it twice, but only when
// define the module it would record in the 'cache.path2uid', so here we just
// record here to avoid fetch twice.
// the hash will be path -> bool constructor.
var sendingList = {};


/**
 * Dynamic config kernel.
 * property of obj can be:
 * [alias]: a collection of short names will be used to stand for
 *     a long name or long path module.
 * [paths]: a hash
 * [baseUrl]:
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


// Global cache.
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
  baseUrl: "",
  debug: true,
  builtin: {

  }
});


/**
 * Clear all cache.
 */
kernel.reset = function() {
  kernel.cache = {
    mods: {},
    id2path: {},
    path2uid: {}
  };
};


// exports APIs functions
global.require = global._req = require;
global.define = global._def = define;
global.kernel = kernel;
