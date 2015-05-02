
/**
 * Module包装类.
 * # uid    自生成的uid标识唯一模块.
 * # id     用户自定义的模块名, 是可选的但如果我们不写id会使一些测试用例失败(see anon_circular case),
 *          于是对一些不必要的测试用例作了修改.
 * # url    模块对用的物理文件路径.
 * # deps   依赖模块的字面亮表示, 也是require|define源码的写法中依赖数组的值.
 *          (todo it also retrieve the requrie statements in function's
 *          string value in case that a CMD wrapper is used. 考虑去掉对cmd的支持)
 * # depMods依赖模块的表示对象数组.
 * # status 当前模块状态, 见 Module.STATUS.
 * # factory模块的导出函数, 通过工厂函数导出模块的表示值.
 * @constructor
 */
function Module(obj) {
  this.uid = obj.uid;
  this.id = obj.id || null;
  this.url = obj.url;
  this.deps = obj.deps || [];
  this.depMods = new Array(this.deps.length);
  this.status = obj.status || Module.STATUS.init;
  this.factory = obj.factory || noop;
  this.exports = {}; // todo
}


/**
 * 模块的4种状态.
 * # init     模块刚被创建, 还没有获取自身的模块.
 * # loaded   只在<IE11出现, 表示自身模块已经下载完成.
 * # fetching 正在获取自身依赖模块但还没导出自身模块.
 * # complete 模块已被导出且缓存到模块池中.
 */
Module.STATUS = {
  'init'      : 0,
  'loaded'    : 1,
  'fetching'  : 2,
  'complete'  : 3
};


/**
 * 当模块已被缓存<code>mod.status = Module.STATUS.complete</code>,
 * 则需要通知所有依赖于它的模块, 需要调用depandant.ready(mod);
 * @param {Module|Object} mod
 */
Module.prototype.ready = function(mod) {
  var inPathConfig;
  if (mod.url) {
    if (kernel.paths && kernel.paths[this.id]) {
      inPathConfig = true;
    }
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
    if (isNull(this.depMods[i])) {
      ok = false;
      break;
    }
  }
  return ok;
};
