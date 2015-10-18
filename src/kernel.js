
/**
 * 全局kerneljs对象
 * @typedef {Object}
 */
var kerneljs = {};

kerneljs.uid = 0;
kerneljs.uidprefix = 'AceMood@kernel_';

/**
 * 保存所有正在获取依赖模块的模块信息.
 * key是模块的uid, value是模块自身.
 * @typedef {Object}
 */
var fetchingList = {
  mods: {},
  add: function(mod) {
    if (this.mods[mod.uid]) {
      kerneljs.trigger(kerneljs.events.error, [
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
 * @typedef {Object}
 */
var dependencyList = {};

/**
 * 如果某个模块处于fetching的状态则说明依赖的js模块文件正在下载, 在完成下载之前我们不希望同一个文件
 * 发起两次下载请求. define时会缓存到cache.path2uid对象中, 我们这里用path作为key标识模块文件正在下载.
 * @typedef {Object}
 */
var sendingList = {};

/**
 * 动态配置kerneljs对象. 目前配置对象的属性可以是:
 * # alias: 短命名id和长路径的映射关系. (todo)
 * # paths: 一个路径映射的hash结构, 详细看:
 *          http://requirejs.org/docs/api.html#config-paths
 * # baseUrl: 所有路经解析的基路径, 包括paths, 但模块内依赖的相对路径针对模块自身路径解析. (todo)
 */
kerneljs.config = function(obj) {
  if (typeOf(obj) !== 'object') {
    throw 'config object must an object';
  }
  var key, k;
  for (key in obj) {
    if (hasOwn.call(obj, key)) {
      if (kerneljs[key]) {
        for (k in obj[key]) {
          kerneljs[key][k] = obj[key][k];
        }
      } else {
        kerneljs[key] = obj[key];
      }
    }
  }
};

/**
 * 全局缓存对象
 * @typedef {Object}
 */
kerneljs.cache = {
  // 全局缓存uid和对应模块. 是一对一的映射关系.
  mods: {},
  // id2path记录所有的用户自定义id的模块. 在开发时不提倡自己写id但实际也可以自己写, 没啥意义
  // 因为请求还是以路径来做. 可以通过paths配置来require短id, 这个缓存对象在开发时会有不少缺失的模块,
  // 但在打包后id已经自生成所以它会记录完全. 这个结构是一个一对一的结构.
  id2path: {},
  // 理论上每个文件可能定义多个模块, 也就是define了多次. 这种情况应该在开发时严格避免,
  // 但经过打包之后一定会出现这种状况. 所以我们必须要做一些处理, 也使得这个结构是一对多的.
  path2uid: {},
  // kerneljs的订阅者缓存
  events: {}
};

// 基础配置
kerneljs.config({
  baseUrl: '',
  debug: true,
  paths: {}
});

/**
 * 重置全局缓存
 */
kerneljs.reset = function() {
  this.cache.mods = {};
  this.cache.id2path = {};
  this.cache.path2uid = {};
};

/**
 * 区分开发环境和部署环境资源地址定位，便于构建时分析。
 * @param {!String} url 相对于本次js模块的地址
 * @returns {!String} 返回线上绝对路径的地址
 */
kerneljs.url = function(url) {
  return url;
};

/** 全局导出 APIs */
global.require = global.__r = require;
global.define = global.__d = define;
global.kerneljs = kerneljs;
