/**
 * @file Facade of kerneljs object
 * @email zmike86@gmail.com
 */

var kernel = {};

// if a global kerneljs object exists,
// treat it as kerneljs configuration later.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
}

// for anonymous module Ids
var uuid = 0;
var uidprefix = 'AceMood@kernel_';

/**
 * 保存所有正在获取依赖模块的模块信息.
 * key是模块的uid, value是模块自身.
 */
var fetchingList = {
  mods: {},
  add: function(mod) {
    if (this.mods[mod.uid]) {
      emit(events.error, [
        'current mod with uid: ' + mod.uid + ' and file path: ' +
        mod.url + ' is fetching now'
      ]);
    }
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

// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here.
/**
 * 记录模块的依赖关系. 如果模块状态置为complete, 则用此对象通知所有依赖他的模块项.
 * 因为解析依赖的时候一般是通过相对路径（除非预配置一些短命名id和路径的映射）
 * 这个结构是以path路径作为key, 模块数组作为value
 */
var dependencyList = {};

/**
 * 如果某个模块处于fetching的状态则说明依赖的js模块文件正在下载，在完成下载之前我们
 * 不希望同一个文件发起两次下载请求。define时会缓存到cache.path2uid对象中，我们这里
 * 用path作为key标识模块文件正在下载
 */
var sendingList = {};

/**
 * 动态配置kerneljs对象. 目前配置对象的属性可以是:
 * # baseUrl:     All relative paths should be resolved base on this uri
 * # resourceMap: All pre-built-in modules and dependencies. If a module has been
 *                registered in resourceMap, skip parse module's source code for
 *                dependency.
 */
function config(obj) {
  if (typeOf(obj) !== 'object') {
    throw 'config object must an object';
  }
  var key, k;
  for (key in obj) {
    if (hasOwn.call(obj, key)) {
      if (kernel.data[key]) {
        for (k in obj[key]) {
          kernel.data[key][k] = obj[key][k];
        }
      } else {
        kernel.data[key] = obj[key];
      }
    }
  }
}

/**
 * 全局缓存对象
 * @typedef {Object}
 */
kernel.cache = {
  // mods记录所有的模块. 在开发时不提倡自己写id但实际也可以自己写,
  // 没啥意义因为请求还是以路径来做. 可以通过paths配置来require短id, 这个缓存对象
  // 在开发时会有不少缺失的模块, 但在打包后id已经自生成所以它会记录完全.
  // 全局缓存uid和对应模块. 是一对一的映射关系.
  mods: {},
  // 理论上每个文件可能定义多个模块，也就是define了多次。这种情况应该在开发时严格避免，
  // 但经过打包之后一定会出现这种状况。所以我们必须要做一些处理，也使得这个结构是一对多的.
  path2uid: {}
};


// clear all relative cache
kernel.reset = function() {
  this.cache.mods = {};
  this.cache.path2uid = {};
  this.data = {};
  handlersMap = {};
};

kernel.config = config;
kernel.on = on;
kernel.emit = emit;
kernel.request = fetchScript;
kernel.eventsType = events;
kernel.data = {};


// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;


// config with preserved global kerneljs object
kernel.config(kernel._kernel);
