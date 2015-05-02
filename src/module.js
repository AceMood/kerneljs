
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
  this.status = obj.status || Module.STATUS.uninit;
  this.factory = obj.factory || noop;
  this.exports = {};
}


/**
 * 模块的5种状态.
 * # uninit   module is only inited but without fetching its deps.
 * # fetching is fetching its deps now but not execute its factory yet.
 * # loaded is specificated in IE means a js file is loaded.
 * # complete is module finished resolve and has cached its exports object.
 */
Module.STATUS = {
  "uninit"    : 0,
  "fetching"  : 1,
  "loaded"    : 2,
  'ready'     : 3,
  "complete"  : 4
};


/**
 * When a mod prepared, then will notify all the modules depend on it.
 * So pass the mod and invoke depandant.ready(mod);
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
