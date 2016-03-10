/**
 * @file Module Class
 * @email zmike86@gmail.com
 */

/**
 * @class
 * @param {object} obj Configuration object. Include:
 *                     --uid: self generated uid.
 *                     --id: user defined moduleId(optional).
 *                     --url: 模块对用的物理文件路径
 *                     --deps: dependency array, which stores moduleId or relative module path.
 *                     --factory: callback function
 *                     --exports: exports object
 *                     --status: Module.STATUS
 */
function Module(obj) {
  // user defined id
  if (obj.id) {
    if (Module._cache[obj.id] && kernel.debug) {
      emit(
        events.error,
        [
          SAME_ID_MSG.replace('%s', obj.id),
          obj.uri
        ]
      );
      return exist_id_error(obj.id);
    }
  }

  this.uid = uidprefix + uuid++;
  this.id = obj.id || this.uid;
  this.uri = obj.uri;
  this.deps = obj.deps || [];
  this.status = Module.STATUS.init;
  this.factory = obj.factory || null;
  this.exports = {};

  // cache
  Module._cache[this.id] = this;
  this.setStatus(Module.STATUS.init);
}

/**
 * Set module's status
 * @param {number} status
 */
Module.prototype.setStatus = function(status) {
  if (status < 0 || status > 4) {
    throw 'Status ' + status + ' is now allowed.';
  } else {
    this.status = status;
    switch (status) {
      case 0:
        emit(events.create, [this]);
        break;
      case 1:
        emit(events.fetch, [this]);
        break;
      case 2:
        emit(events.loaded, [this]);
        break;
      case 3:
        emit(events.complete, [this]);
        break;
    }
  }
};

/**
 * Inform current module that one of its dependencies has been loaded.
 * @return {boolean}
 */
Module.prototype.checkAll = function() {
  var ok = true;
  // native forEach will skip nullify value, when exports is
  // an empty string, it will break, so use a for loop
  for (var i = 0; i < this.deps.length; ++i) {
    var dependency = resolve(this.deps[i], this);
    if (!dependency || (dependency.status < Module.STATUS.loaded)) {
      ok = false;
      break;
    }
  }
  return ok;
};

/**
 * compile module
 */
Module.prototype.compile = function() {
  if (this.status === Module.STATUS.complete) {
    return;
  }

  /**
   * require has two approaches:
   * a. var mod = require('widget/a');
   * b. require.async(['widget/a'], function(wid_a) {
   *      wid_a.init();
   *    });
   * @param {!string} moduleId module id or relative path
   */
  function localRequire(moduleId) {
    var argLen = arguments.length;
    if (argLen < 1) {
      throw 'require must have at least one parameter.';
    }

    // a simple require statements always be preloaded.
    // so return its complied exports object.
    var mod = resolve(moduleId, self);
    if (mod && (mod.status >= Module.STATUS.loaded)) {
      mod.compile();
      return mod.exports;
    } else {
      throw 'require unknown module with id: ' + moduleId;
    }
  }

  /**
   * Resolve path of the given id.
   * @param  {string} id
   * @return {string|object}
   */
  localRequire.toUrl = function(id) {
    return resolvePath(id);
  };

  /**
   * Asynchronously loading module after page loaded.
   * @param {string} id moduleId.
   * @param {function} callback callback function.
   */
  localRequire.async = function(id, callback) {
    var type = typeOf(id);
    if (type === 'string') {
      requireAsync([id], callback);
    } else if (type === 'array') {
      requireAsync(id, callback);
    }
  };

  var self = this;
  this.factory.call(null, localRequire, this.exports, this);
  delete this.factory;
  this.setStatus(Module.STATUS.complete);
};

/**
 * Module's status:
 *  init:     created with `new` operator.
 *  fetching: loading dependencies script.
 *  loaded:   all dependencies are ready.
 *  complete: after compiled.
 */
Module.STATUS = {
  'init'      : 0,
  'fetching'  : 1,
  'loaded'    : 2,
  'complete'  : 3
};

// cache for module
// id-module key-pairs
Module._cache = {};
