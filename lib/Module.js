/**
 * @file Module Class
 * @email zmike86@gmail.com
 */

/**
 * @class
 * @param {object} obj Configuration object. Include:
 *                     --uid: self generated uid.
 *                     --id: user defined moduleId(optional).
 *                     --uri: 模块对用的物理文件路径
 *                     --deps: dependency array, which stores moduleId or relative module path.
 *                     --factory: callback function
 *                     --exports: exports object
 *                     --status: Module.Status
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
  this.depsCount = this.deps.length;
  this.status = Module.Status.init;
  this.factory = obj.factory || null;
  this.exports = {};

  // cache
  Module._cache[this.id] = this;
  this.setStatus(Module.Status.init);
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
  return this.depsCount === 0;
};

/**
 * compile module
 * @return {*} module's exports object
 */
Module.prototype.compile = function() {
  if (this.status === Module.Status.complete) {
    return this.exports;
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
    if (mod && (mod.status >= Module.Status.loaded)) {
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
    if (typeOf(callback) !== 'function') {
      throw 'require.async second parameter must be a function';
    }

    var type = typeOf(id);
    if (type === 'string') {
      requireAsync([id], callback, self);
    } else if (type === 'array') {
      requireAsync(id, callback, self);
    }
  };

  var self = this;
  // css module not have factory
  if (this.factory) {
    this.factory.call(null, localRequire, this.exports, this);
    delete this.factory;
  }
  this.setStatus(Module.Status.complete);
  return this.exports;
};

/**
 * Module's status:
 *  init:     created with `new` operator.
 *  fetching: loading dependencies script.
 *  loaded:   all dependencies are ready.
 *  complete: after compiled.
 */
Module.Status = {
  'init'      : 0,
  'fetching'  : 1,
  'loaded'    : 2,
  'complete'  : 3
};

// cache for module
// id-module key-pairs
Module._cache = {};
