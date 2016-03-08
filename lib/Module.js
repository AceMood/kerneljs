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
  this.uid = uidprefix + uuid++;
  this.id = obj.id || this.uid;
  this.url = obj.url;
  this.deps = obj.deps || [];
  this.status = Module.STATUS.init;
  this.factory = obj.factory || null;
  this.exports = {};

  // cache
  Module._cache[this.id] = this;
}

/**
 * Set module's status
 * @param {number} status
 */
Module.prototype.setStatus = function(status) {
  var mod = this;
  if (status < 0 || status > 4) {
    throw 'Status ' + status + ' is now allowed.';
  } else {
    mod.status = status;
    switch (status) {
      case 2:
        emit(events.fetch, [mod]);
        break;
      case 3:
        emit(events.complete, [mod]);
        break;
    }
  }
};

/**
 * 当模块已被缓存, 则需要通知所有依赖于它的模块,
 * 需要调用depandant.ready(mod);
 * @param {Module|Object} mod
 */
Module.prototype.ready = function(mod) {
  var inPathConfig;
  if (mod.url) {
    if (kerneljs.data.paths && kerneljs.data.paths[this.id]) {
      inPathConfig = true;
    }
    for(var i = 0; i < this.deps.length; ++i) {
      var path = resolvePath(this.deps[i], inPathConfig ? loc.href : this.url);
      if (path === mod.url) {
        this.depExports[i] = mod.exports;
        break;
      }
    }
  }
  if (this.checkAllDeps()) {
    notify(this);
  }
};

/**
 * 检查是否模块的依赖项都已complete.
 * @return {boolean}
 */
Module.prototype.checkAllDeps = function() {
  var ok = true;
  // 没用原生forEach因为会跳过所有空值, 结果不可预期.
  // 由于模块导出值也可能是字符串, 尤其是模板相关的模块,
  // 所以这里通过isNull函数检查.
  for (var i = 0; i < this.depExports.length; ++i) {
    if (isNull(this.depExports[i])) {
      ok = false;
      break;
    }
  }
  return ok;
};

/** 更新mod.depExports */
Module.prototype.resolveDeps = function() {
  var mod = this;

  function requireInContext(id, callback) {
    // 异步调用代理到全局require方法
    if (typeOf(id) === 'array' &&
        typeOf(callback) === 'function') {
      return require(id, callback);
    }

    if (typeOf(id) !== 'string' || !!callback) {
      throw 'Module require\'s args TypeError.';
    }

    return requireDirectly(id, mod.url);
  }

  requireInContext.async = require.async;
  requireInContext.toUrl = require.toUrl;

  if (mod.deps && mod.deps.length > 0) {
    forEach(mod.deps, function(dep, index) {
      if (dep === 'require') {
        mod.depExports[index] = requireInContext;
        return;
      } else if (dep === 'exports') {
        mod.depExports[index] = mod.exports;
        mod.cjsWrapper = true;
        return;
      } else if (dep === 'module') {
        mod.depExports[index] = mod;
        mod.cjsWrapper = true;
        return;
      }

      // 解析依赖模块, 更新mod.depExports.
      var inject = resolve(dep, mod);
      if (inject) {
        mod.depExports[index] = inject;
      }
    });
  }
};

/**
 * compile module
 */
Module.prototype.compile = function() {
  var mod = this;
  mod.factory.apply(null, localRequire, mod.exports, mod);

  if (!kernel.data.debug) {
    delete mod.factory;
  }

  mod.setStatus(Module.STATUS.complete);
};

/**
 * Module's status:
 *  init     created.
 *  loaded   when < IE11, module script loaded, but not compiled.
 *  fetching loading module script.
 *  complete after compiled.
 */
Module.STATUS = {
  'init'      : 0,
  'loaded'    : 1,
  'fetching'  : 2,
  'complete'  : 3
};

// cache for module
Module._cache = {};
