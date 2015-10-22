
/**
 * Module包装类.
 * # uid    自生成的uid标识唯一模块.
 * # id     用户自定义的模块名, 是可选的. 但如果我们不写id会使一些测试用例失败(see anon_circular case),
 *          于是对一些不必要的测试用例作了修改.
 * # url    模块对用的物理文件路径.
 * # deps   依赖模块的字面亮表示, 也是require|define源码的写法中依赖数组的值.
 *          (todo it also retrieve the requrie statements in function's
 *          string value in case that a CMD wrapper is used. 考虑去掉对cmd的支持)
 * # depMods依赖模块的表示对象数组.
 * # status 当前模块状态, 见 Module.STATUS.
 * # factory模块的导出函数, 通过工厂函数导出模块的表示值.
 *
 * @constructor
 * @param {Object} obj 配置对象
 */
function Module(obj) {
  this.uid = obj.uid;
  this.id = obj.id || null;
  this.url = obj.url;
  this.deps = obj.deps || [];
  this.depExports = new Array(this.deps.length);
  this.status = obj.status || Module.STATUS.init;
  this.factory = obj.factory || noop;
  this.exports = {}; // todo
}

/**
 * 设置模块状态
 * @param {Number} status
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
    if (kerneljs.paths && kerneljs.paths[this.id]) {
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

/** 执行模块的回调函数 */
Module.prototype.exec = function() {
  var mod = this;

  // amd
  if (!mod.cjsWrapper) {
    mod.exports = typeOf(mod.factory) === 'function' ?
        mod.factory.apply(null, mod.depExports) :
        mod.factory;
  } else {
    mod.factory.apply(null, mod.depExports);
  }

  if (isNull(mod.exports)) {
    mod.exports = {};
  }

  // 删除回调函数
  if (!kerneljs.config.debug) {
    delete mod.factory;
  }

  mod.setStatus(Module.STATUS.complete);
};

/**
 * 模块的4种状态.
 *  init     模块刚被创建, 还没有获取自身的模块.
 *  loaded   只在<IE11出现, 表示自身模块已经下载完成.
 *  fetching 正在获取自身依赖模块但还没导出自身模块.
 *  complete 模块已被导出且缓存到模块池中.
 */
Module.STATUS = {
  'init'      : 0,
  'loaded'    : 1,
  'fetching'  : 2,
  'complete'  : 3
};
