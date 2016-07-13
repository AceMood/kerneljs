/**
 * @file Module Class
 * @author AceMood
 * @email zmike86@gmail.com
 */

/**
 * @class
 * @param {object} obj Configuration object. Include:
 *                     --uid: self generated uid.
 *                     --id: user defined moduleId(optional).
 *                     --uri: absolute path of file
 *                     --deps: dependency array, which stores moduleId or relative module path.
 *                     --factory: callback function
 *                     --exports: exports object
 *                     --status: Module.Status
 */
function Module(obj) {
  // custom id
  if (obj.id) {
    if (Module._cache[obj.id]) {
      emit(
        events.error,
        [
          SAME_ID_MSG.replace('%s', obj.id),
          obj.uri
        ]
      );
      return existIdError(obj.id)
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
  this.isEntryPoint = obj.isEntryPoint;

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
    throw 'Status ' + status + ' is now allowed.'
  } else if (status === 0) {
    this.status = status;
    emit(events.create, [this])
  } else if (status === 1) {
    this.status = status;
    emit(events.fetch, [this])
  } else if (status === 2) {
    this.status = status;
    emit(events.ready, [this])
  } else if (status === 3) {
    this.status = status;
    emit(events.complete, [this])
  }
};

/**
 * Inform current module that one of its dependencies has been loaded.
 * @return {boolean}
 */
Module.prototype.checkAll = function() {
  return this.depsCount === 0
};

/**
 * compile module
 * @return {*} module's exports object
 */
Module.prototype.compile = function() {
  if (this.status === Module.Status.complete) {
    return this.exports
  }

  /**
   * require has two forms:
   * a. var mod = require('widget/a');
   * b. require.async(['widget/a'], function(wid_a) {
   *      wid_a.init();
   *    });
   * @param {!string} name module Id or relative path
   */
  function localRequire(name) {
    var argLen = arguments.length;
    if (argLen < 1) {
      throw 'require must have at least one parameter.'
    }

    // a simple require statements always be pre-loaded.
    // so return its complied exports object.
    var mod = resolve(name, self.uri);
    if (mod && (mod.status >= Module.Status.ready)) {
      mod.compile();
      return mod.exports
    } else {
      throw 'require unknown module with id: ' + name
    }
  }

  /**
   * Resolve path of the given id.
   * @param  {string} id
   * @return {string|object}
   */
  localRequire.toUrl = resolvePath;

  /**
   * Asynchronously loading module after page loaded.
   * @param {string|Array} id moduleId or dependencies names.
   * @param {function} callback callback function.
   */
  localRequire.async = function(id, callback) {
    if (typeOf(callback) !== 'function') {
      throw 'require.async second parameter must be a function'
    }

    var deps = [];
    var type = typeOf(id);
    if (type === 'string') {
      deps = [id]
    } else if (type === 'array') {
      deps = id
    }

    var anon = new AnonymousModule({
      uri: self.uri,
      deps: deps,
      factory: callback,
      isEntryPoint: true
    });

    anon.fetch()
  };

  var self = this;
  // css module not have factory
  if (this.factory) {
    this.factory.apply(null, [localRequire, this.exports, this]);
    delete this.factory
  }
  this.setStatus(Module.Status.complete);
  return this.exports
};

/**
 * async load dependency
 */
Module.prototype.fetch = function() {
  var module = this;
  module.setStatus(Module.Status.fetching);
  // no dependencies
  if (module.deps.length === 0) {
    ready(module);
    return
  }

  forEach(module.deps, function(name) {
    // will execute after define
    function onLoad() {
      dependencyModule = resolve(name, module.uri);
      if (dependencyModule.deps.length === 0) {
        ready(dependencyModule)
      } else {
        dependencyModule.fetch()
      }
    }

    var dependencyModule = resolve(name, module.uri);
    if (dependencyModule) {
      recordDependencyList(dependencyModule.uri, module);
      if (dependencyModule.status >= Module.Status.ready) {
        ready(dependencyModule);
        module.depsCount--
      } else if (dependencyModule.status === Module.Status.init) {
        dependencyModule.fetch()
      }
    } else {
      var uri = buildFetchUri(name, module.uri);
      recordDependencyList(uri, module);
      fetch(uri, onLoad)
    }
  });

  // might been loaded through require.async and compiled before
  if (module.checkAll() && module.status < Module.Status.ready) {
    ready(module)
  }
};

/**
 * Module's status:
 *  init:     created with `new` operator, in define or fetchCss.
 *  fetching: loading dependencies script.
 *  ready:   all dependencies are ready.
 *  complete: after compiled.
 */
Module.Status = {
  'init'      : 0,
  'fetching'  : 1,
  'ready'     : 2,
  'complete'  : 3
};

// cache for module
// id-module key-pairs
Module._cache = {};

/**
 * Internal define function. Differ if is entry point factory which
 * should be called immediately after loaded, or else not execute until
 * require occur.
 * @param {string|function} id module Id or factory function
 * @param {function=} factory callback function
 * @param {boolean} entry If entry point
 */
Module.define = function(id, factory, entry) {
  var resourceMap = kernel.data.resourceMap;
  var inMap = resourceMap && resourceMap.JS[id];

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null
  }

  if (typeOf(factory) !== 'function') {
    throw 'define with wrong parameters ' + factory
  }

  var uri, deps;
  if (inMap) {
    uri = resourceMap.JS[id].uri;
    deps = resourceMap.JS[id].deps;
    if (resourceMap.JS[id].css) {
      for (var n = 0; n < resourceMap.JS[id].css.length; n++) {
        deps.push('css:' + resourceMap.JS[id].css[n])
      }
    }
  } else {
    uri = getCurrentScriptPath();
    deps = [];
    var requireTextMap = {};
    factory.toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        if (!requireTextMap[dep]) {
          deps.push(dep);
          requireTextMap[dep] = true
        }
      })
  }

  var module = new Module({
    id: id,
    uri: uri,
    deps: deps,
    factory: factory,
    isEntryPoint: entry
  });

  // cache in path2id
  recordPath2Id(uri, module.id);

  // entry-point fetch dependencies
  if (entry) {
    module.fetch()
  }
};
