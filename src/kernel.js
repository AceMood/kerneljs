
/**
 * 全局kerneljs对象
 * @typedef {Object}
 */
kerneljs = {};


// 若之前引入过其他全局变量, 则替换成私有变量_kerneljs, 而原有kerneljs则会被替换
if (global.kerneljs) {
  kerneljs.kerneljs = global.kerneljs;
}


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
      kerneljs.trigger('error', [[
        'current mod with uid: ',
        mod.uid,
        ' and file path: ',
        mod.url,
        ' is fetching now'
      ].join('')]);
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
 * 记录模块的依赖关系. 如果模块状态置为complete, 则用此对象同志所有依赖他的模块项.
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
  // and id2path record all module that have a user-defined id.
  // its a pairs; not all modules have user-defined id, so this object
  // if lack of some modules in debug mode;
  // But imagine build, all modules will have self-generated id.
  // It's a one-to-one hash constructor, because a user-defined id
  // can only defined in one file.
  id2path: {},
  // each file may have multiple modules. so it's a one-to-many hash
  // constructor.
  path2uid: {},
  // kerneljs的订阅者缓存
  events: {}
};


// 基础配置
kerneljs.config({
  baseUrl: '',
  debug: true
});


/**
 * 重置全局缓存
 */
kerneljs.reset = function() {
  this.cache = {
    mods: {},
    id2path: {},
    path2uid: {},
    events: {}
  };
};


/**
 * 订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Function} handler 事件处理器
 * @param {*} context 事件处理器上下文
 */
kerneljs.on = function(eventName, handler, context) {
  if (!this.cache.events[eventName]) {
    this.cache.events[eventName] = [];
  }
  this.cache.events[eventName].push({
    handler: handler,
    context: context
  });
};


/**
 * 触发订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Array.<Object>} args 参数
 */
kerneljs.trigger = function(eventName, args) {
  // 缓存防止事件处理器改变kerneljs.cache对象
  var arr = this.cache.events[eventName];
  if (arr) {
    forEach(arr, function(obj) {
      obj.handler.apply(obj.context, args);
    });
  }
};


/** 导出全局短命名 APIs */
global._req = require;
global._def = define;
