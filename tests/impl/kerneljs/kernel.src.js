/**
 * Author:  AceMood
 * Email:   zmike86@gmail.com
 * Version: 0.2.2
 */

/**
 * ==================================================================
 * browser code in development
 *
 * The Asynchronous Module Definition (AMD) API specifies a mechanism
 * for defining modules such that the module and its dependencies can
 * be asynchronously loaded. This is particularly well suited for the
 * browser environment where synchronous loading of modules incurs
 * performance, usability, debugging, and cross-domain access problems.
 *
 * ==================================================================
 * compiled for production in browser
 *
 *
 * See for more:
 * "https://github.com/amdjs/amdjs-api/wiki/AMD"
 */

(function (global, undefined) {

'use strict';

var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;

// use such an object to determine cut down a forEach loop;
var break_obj = {};

/** 空函数作为默认回调函数 */
function noop() {}

/**
 * NOTE:
 * The forEach function is intentionally generic;
 * it does not require that its this value be an Array object.
 * Therefore it can be transferred to other kinds of objects
 * for use as a method. Whether the forEach function can be applied
 * successfully to a host object is implementation-dependent.
 *
 * @param {Array|NodeList} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 */
function forEach(arr, fn, opt_context) {
  if (native_forEach && arr.forEach === native_forEach) {
    arr.forEach(fn, opt_context);
  } else if (arr.length === +arr.length) {
    for (var i = 0, length = arr.length; i < length; i++) {
      if (fn.call(opt_context, arr[i], i, arr) === break_obj) {
        break;
      }
    }
  }
}

/**
 * 正向寻找指定项在数组的位置;
 * @param {Array} arr
 * @param {*} tar
 * @return {Number}
 */
function indexOf(arr, tar) {
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === tar) {
      return i;
    }
  }
  return -1;
}

/**
 * 类型映射
 * @type {Object}
 */
var typeMap = {
  '[object Object]'   : 'object',
  '[object Array]'    : 'array',
  '[object Function]' : 'function',
  '[object RegExp]'   : 'regexp',
  '[object String]'   : 'string',
  '[object Number]'   : 'number'
};

/**
 * 判断对象类型, 见typeMap
 */
function typeOf(obj) {
  return typeMap[toString.call(obj)];
}

/**
 * 判断是否为undefined或者null
 * @param {*} obj
 * @return {boolean}
 */
function isNull(obj) {
  return obj === void 0 || obj === null;
}

// 解析ua
var resArr = [
    'Trident\/([^ ;]*)',
    'AppleWebKit\/([^ ;]*)',
    'Opera\/([^ ;]*)',
    'rv:([^ ;]*)(.*?)Gecko\/([^ ;]*)',
    'MSIE\s([^ ;]*)',
    'AndroidWebKit\/([^ ;]*)'
];
var engineRe = new RegExp(resArr.join('|')),
    engine = window.navigator.userAgent.match(engineRe) || 0,
    curStyle, curSheet;

// 用style元素中的@import加载css模块
// IE < 9, Firefox < 18
var useImportLoad = false,
// 采用onload事件在webkit下会有问题，此时设成false
    useOnload = true;

// trident / msie
if (engine[1] || engine[7]) {
  useImportLoad = (engine[1] - 0) < 6 || (engine[7] - 0) <= 9;
  // webkit
} else if (engine[2] || engine[8]) {
  useOnload = false;
  // gecko
} else if (engine[4]) {
  useImportLoad = (engine[4] - 0) < 18;
}

var ieCnt = 0;
var ieLoads = [];
var ieCurCallback;

function createIeLoad(url) {
  curSheet.addImport(url);
  curStyle.onload = processIeLoad;

  ieCnt++;
  if (ieCnt === 31) {
    createStyle();
    ieCnt = 0;
  }
}

function processIeLoad() {
  ieCurCallback();

  var nextLoad = ieLoads.shift();

  if (!nextLoad) {
    ieCurCallback = null;
    return;
  }

  ieCurCallback = nextLoad[1];
  createIeLoad(nextLoad[0]);
}

/**
 * 创建style元素加载模块
 * @param {String} url css地址
 * @param {Function} callback 回调函数
 */
function importLoad(url, callback) {
  if (!curSheet || !curSheet.addImport) {
    createStyle();
  }

  if (curSheet && curSheet.addImport) {
    // old IE
    if (ieCurCallback) {
      ieLoads.push([url, callback]);
    }
    else {
      createIeLoad(url);
      ieCurCallback = callback;
    }
  }
  else {
    // old Firefox
    curStyle.textContent = '@import "' + url + '";';

    var loadInterval = setInterval(function() {
      try {
        var tmp = curStyle.sheet.cssRules;
        clearInterval(loadInterval);
        callback();
      } catch(e) {}
    }, 10);
  }
}

/**
 * 创建link元素监听onload事件
 * @param {String} url css地址
 * @param {Function} callback 回调函数
 */
function linkLoad(url, callback) {
  // 轮询
  var loop = function() {
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      if (sheet.href === link.href) {
        clearTimeout(loadInterval);
        return callback();
      }
    }
    loadInterval = setTimeout(loop, 10);
  };
  // link
  var link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  if (useOnload) {
    link.onload = function() {
      link.onload = function() {};
      // for style dimensions queries, a short delay can still be necessary
      setTimeout(callback, 7);
    };
  } else {
    var loadInterval = setTimeout(loop, 10);
  }
  link.href = url;
  $head.appendChild(link);
}

/**
 * 创建style元素
 */
function createStyle() {
  curStyle = $doc.createElement('style');
  $head.appendChild(curStyle);
  curSheet = curStyle.styleSheet || curStyle.sheet;
}


var $doc = document,
    $head = $doc.head || $doc.getElementsByTagName('head')[0],
    // IE6下的经典bug, 有base元素的情况下head.appendChild容易出错in jQuery.
    // 详见: 'http://dev.jquery.com/ticket/2709'
    $base = $doc.getElementsByTagName('base')[0];

if ($base) {
  $head = $base.parentNode;
}

// current adding script node
var currentAddingScript,
    // 老版本Firefox不支持script.readyState, so we only use this prop
    // in IEs. Although 'onload' in IE9 & IE10 have problems, but I do not
    // care the issure, and whatever async is true or false. We just
    // remove node in document as the callback of javascript loaded.
    // Read more about the bug:
    // 'https://connect.microsoft.com/IE/feedback/details/729164/'
    // + 'ie10-dynamic-script-element-fires-loaded-readystate-prematurely'
    // 'https://connect.microsoft.com/IE/feedback/details/648057/'
    // + 'script-onload-event-is-not-fired-immediately-after-script-execution'
    useInteractive = ('readyState' in $doc.createElement('script')),
    // loop all script nodes in doc, if one's readyState is 'interactive'
    // means it's now executing;
    interactiveScript;

/**
 * @param {String} url 文件路径
 * @param {String} name 原始require本模块时用到的名字或路径.
 *   top-level name, relative name or absolute name.
 * @param {Function} callback
 */
function fetchCss(url, name, callback) {
  function onCssLoad() {
    var mod, cache = kerneljs.cache,
        uid = uidprefix + uuid++;

    // doc.currentScript在异步情况下比如事件处理器或者setTimeout返回错误结果.
    // 但如果不是这种情况且遵循每个文件一个define模块的话这个属性就能正常工作.
    var base = url;

    // 缓存path2uid
    if (cache.path2uid[base]) {
      cache.path2uid[base].push(uid);
    } else {
      cache.path2uid[base] = [uid];
    }

    // 创建模块
    mod = cache.mods[uid] = {
      uid: uid,
      id: null,
      url: url,
      deps: [],
      factory: null,
      status: Module.STATUS.complete
    };
    emit(events.create, [mod]);

    // 打包过后define会先发生, 这种情况script标签不会带有kernel_name字段.
    if (name && isTopLevel(name) && !mod.id) {
      mod.id = name;
    }

    fetchingList.remove(mod);
    mod.exports = {};

    // Register module in global cache
    kerneljs.cache.mods[mod.uid] = mod;
    // two keys are the same thing
    if (mod.id) {
      kerneljs.cache.mods[mod.id] = mod;
    }

    // Dispatch ready event.
    // All other modules recorded in dependencyList depend on this mod
    // will execute their factories by order.
    var depandants = dependencyList[mod.url];
    if (depandants) {
      // Here I first delete it because a complex condition:
      // if a define occurs in a factory function, and the module whose
      // factory function is current executing, it's a callback executing.
      // which means the currentScript would be mod just been fetched
      // successfully. The url would be the previous one, and we store the
      // record in global cache dependencyList.
      // So we must delete it first to avoid the factory function execute twice.
      delete dependencyList[mod.url];
      forEach(depandants, function(dependant) {
        if (dependant.ready && dependant.status === Module.STATUS.fetching) {
          dependant.ready(mod);
        }
      });
    }
  }

  var method = (useImportLoad ? importLoad : linkLoad);
  method(url, onCssLoad);
}

/**
 * @param {String} url 文件路径
 * @param {String} name 原始require本模块时用到的名字或路径.
 *   top-level name, relative name or absolute name.
 * @param {Function} callback
 */
function fetchScript(url, name, callback) {
  var onScriptLoad = function() {
    if (!script.readyState || /complete/.test(script.readyState)) {
      interactiveScript = null;
      script.onreadystatschange = script.onload = script.onerror = null;
      // Remove the script to reduce memory leak
      if (!kerneljs.config.debug) {
        $head.removeChild(script);
      }
      script = null;
      callback();
    }
  };
  var script = $doc.createElement('script');
  script.charset = 'utf-8';
  script.async = 1;
  // custom attribute to remember the original required name
  // which written in dependant module.
  script.kn_name = name;

  // 监听
  script.onreadystatechange = script.onload = script.onerror = onScriptLoad;

  // 老版本IE(<11)在设置了script.src之后会立刻请求js文件,
  // 下载完成后触发readyState变更为`loaded`, 代码执行完毕
  // readyState会变为`complete`. IE11去掉了这个特性.
  script.src = url;
  currentAddingScript = script;
  if ($base) {
    $head.insertBefore(script, $base);
  } else {
    $head.appendChild(script);
  }
  currentAddingScript = null;
}

/**
 * 获取模块
 * @param {String} url 文件路径
 * @param {String} name 原始require本模块时用到的名字或路径.
 *   top-level name, relative name or absolute name.
 * @param {Function} callback
 */
function fetch(url, name, callback) {
  if (url.indexOf('.css') === url.length - 4) {
    fetchCss(url, name, callback);
  } else {
    fetchScript(url, name, callback);
  }
}

/**
 * 获取当前页面中所有script节点
 * @return {NodeList}
 */
function scripts() {
  return $doc.getElementsByTagName('script');
}

/**
 * 获取当前正在执行的script元素。
 * In chrome and FF and Opera, use Error.prototype.stack
 * It's important to note that this will not reference the <script> element
 * if the code in the script is being called as a callback or event handler;
 * it will only reference the element while it's initially being processed.
 * Read more:
 *   'https://developer.mozilla.org/en-US/docs/Web/API/document.currentScript'
 * @return {*}
 */
function getCurrentScript() {
  // 去掉document.currentScript的判断, 因为它并不准确.
  // 除了异步的情况, w3c对其值有明确说明, 有时未必是我们想要的特别在
  // CommonJS wrapper的情况下
  return currentAddingScript ||
      (function() {
        var _scripts;
        if (useInteractive) {
          if (interactiveScript &&
              interactiveScript.readyState === 'interactive') {
            return interactiveScript;
          }

          _scripts = scripts();
          forEach(_scripts, function(script) {
            if (script.readyState === 'interactive') {
              interactiveScript = script;
              return break_obj;
            }
          });
          return interactiveScript;
        }

        var ret = null;
        var stack;
        try {
          var err = new Error();
          Error.stackTraceLimit = 100;
          throw err;
        } catch(e) {
          stack = e.stack;
        }

        if (!stack) {
          return ret;
        }

        /**
         * chrome uses ` at `, FF uses `@`
         * Also consider IE 11.
         * FireFox: e.g.
         * require@file:///D:/Develop/SOI/lib/kernel.js:563:29
         * require.async@file:///D:/Develop/SOI/lib/kernel.js:1178:5
         * y/a<@file:///D:/Develop/SOI/demo/lib/events/util.js:2:2610
         *
         * chrome 39.0 e.g.
         * at file:///D:/lib/kernel.js:261:15
         * at require (file:///D:/lib/kernel.js:563:29)
         * at HTMLButtonElement.<anonymous> (file:///D:/lib/events/util.js:2:2610)"
         *
         * IE11 e.g.
         * at Anonymous function (file:///D:/Develop/SOI/lib/kernel.js:294:7)
         * at getCurrentPath (file:///D:/Develop/SOI/lib/kernel.js:314:16)
         * at Global code (file:///D:/Develop/SOI/lib/kernel.js:563:29)
         */
        var e = stack.indexOf(' at ') !== -1 ? ' at ' : '@';
        var index = stack.indexOf('.async');
        if (index > -1) {
          stack = stack.substring(index + 7);
          stack = stack.split(e)[1];
          stack = stack.replace(/^([^\(]*\()/, '');
        } else {
          while (stack.indexOf(e) !== -1) {
            stack = stack.substring(stack.indexOf(e) + e.length);
          }
        }

        stack = stack.substring(0, stack.indexOf('.js') + 3);
        // for ie11
        stack = stack.replace(/^([^\(]*\()/, '');

        forEach(scripts(), function(script) {
          var path = getAbsPathOfScript(script);
          if (path === stack) {
            ret = script;
            return break_obj;
          }
        });
        return ret;
      })();
}

/**
 * 跨浏览器解决方案获得script节点的src绝对路径.
 * @param {HTMLScriptElement} script
 * @return {String}
 */
function getAbsPathOfScript(script) {
  return script.hasAttribute ? script.src : script.getAttribute('src', 4);
}

/**
 * 获取当前执行js代码块的绝对路径. node为空则返回null
 * @return {?String}
 */
function getCurrentScriptPath() {
  var node = getCurrentScript();
  return node ? getAbsPathOfScript(node) : null;
}

// A directory file path must be ends with a slash (back slash in window)
var dirRegExp = /\/$/g,
    fileExtRegExp = /\.(js|css|tpl|txt)$/,
    dot = '.',
    slash = '/',
    dot2 = '..';

// retrieve current doc's absolute path
// It may be a file system path, http path
// or other protocol path
var loc = global.location;

/**
 * Normalize a string path, taking care of '..' and '.' parts.
 * This method perform identically with node path.normalize.
 *
 * When multiple slashes are found, they're replaced by a single one;
 * when the path contains a trailing slash, it is preserved.
 * On Windows backslashes are used in FileSystem.
 *
 * Example:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {String} p
 */
function normalize(p) {
  // step1: combine multi slashes
  p = p.replace(/(\/)+/g, slash);

  // step2: resolve '.' and '..'
  p = resolveDot(p);
  return p;
}

/**
 * resolve a path with a '.' or '..' part in it.
 * @param {String} p
 * @return {String}
 */
function resolveDot(p) {
  // Here I used to use /\//ig to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  p = p.split(slash);
  for (var i = 0; i < p.length; ++i) {
    if (p[i] === dot) {
      p.splice(i, 1);
      --i;
    } else if (p[i] === dot2 && i > 0 && p[i - 1] !== dot2) {
      p.splice(i - 1, 2);
      i -= 2;
    }
  }
  return p.join(slash);
}

/**
 * Judge if a path is top-level, such as 'core/class.js'
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isTopLevel(p) {
  // if we use array-like as string[index] will return undefined
  // in IE6 & 7, so we should use string.charAt(index) instead.
  // see more:
  // 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
  // +Global_Objects/String#section_5'
  return isRelative(p) && p.charAt(0) !== dot;
}

/**
 * Return if a path is absolute.
 * In most web environment, absolute url starts with a 'http://' or 'https://';
 * In Windows File System, starts with a 'file:///' protocol;
 * In UNIX like System, starts with a single '/';
 *
 * @param {string} p Path to check.
 * @return {boolean} b Is p absolute?
 */
function isAbsolute(p) {
  return /:\/\//.test(p) || /^\//.test(p);
}

/**
 * Return if a path is relative.
 * In most web environment, relative path start with a single/double dot.
 * e.g: ../a/b/c; ./a/b
 *
 * Here we think topLevel path is a kind of relative path.
 *
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isRelative(p) {
  return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p.charAt(0) !== slash);
}

/**
 * Map the identifier for a module to a Internet file
 * path. SCRIPT insertion will set path with it, except
 * build-in names.
 *
 * @param {String} id 依赖模块的name或者id。
 * @param {String=} base 作为baseUri，解析依赖模块的绝对路径。
 * @return {!(String|Object)} exports object or absolute file path from Internet
 */
function resolvePath(id, base) {
  // var _mod = kerneljs.cache.mods[id];
  if (id === "require" ||
    id === "module" ||
    id === "exports" /*|| (_mod &&  _mod != empty_mod)*/) {
    return id;
  }

  if (isTopLevel(id)) {
    // step 1: normalize id and parse head part as paths
    id = parsePaths(id);
    // step 2: normalize id and parse head part as pkgs
    id = parsePackages(id);
    // here if a top-level path then relative base change to
    // current document's baseUri.
    base = null;
  }

  // step 3: add file extension if necessary
  id = normalize(id);
  var conjuction = id.charAt(0) === slash ? '' : slash;
  var url = (base ? dirname(base) : dirname(loc.href)) + conjuction + id;

  if (!fileExtRegExp.test(url)) {
    url += '.js';
  }

  url = resolveDot(url);

  return url;
}

/**
 * 提取路径中的目录名. Similar to the
 * UNIX dirname command.
 * Usage:
 * dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {String} p
 * @return {String}
 */
function dirname(p) {
  if (dirRegExp.test(p)) {
    return p.slice(0, -1);
  }
  // Here I used to use /\//ig to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  var ps = p.split(slash);
  ps.pop();
  return ps.join(slash);
}

/**
 * paths设置的别名会出现在路径的头部。
 * 根据kerneljs.paths替换
 * @param {String} p 依赖模块路径
 * @return {String} s 替换后的路径
 */
function parsePaths(p) {
  var ret = [];
  if (kerneljs.paths) {
    var part = p;
    var parts = p.split(slash);
    while (!(part in kerneljs.paths) && parts.length) {
      ret.unshift(parts.pop());
      part = parts.join(slash);
    }
    p = kerneljs.paths[part] ? kerneljs.paths[part] : part;
  }
  return p + ret.join(slash);
}

/**
 * pkg name can also impact on path resolving.
 * After paths, we should find it in pkg configuration.
 * So replace it if exists in kerneljs.packages.
 * @param {String} p
 * @return {String} s
 */
function parsePackages(p) {
  var pkgs = kerneljs.packages,
      fpath = '';
  if (pkgs && pkgs.length > 0) {
    forEach(pkgs, function(pkg) {
      // starts with a package name
      if (p.indexOf(pkg.name) === 0) {
        // absolutely equal
        if (p.length === pkg.name.length) {
          fpath = slash + (pkg.main ? pkg.main : 'main');
        }
        p = p.replace(pkg.name, pkg.location || pkg.name) + fpath;
        return break_obj;
      }
    });
  }
  return p;
}

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
 * 当模块已被缓存<code>mod.status = Module.STATUS.complete</code>,
 * 则需要通知所有依赖于它的模块, 需要调用depandant.ready(mod);
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
  // I do not use forEach here because native forEach will
  // bypass all undefined values, so it will introduce
  // some tricky results.
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
  if (mod.deps && mod.deps.length > 0) {
    forEach(mod.deps, function(dep, index) {
      if (/^(exports|module)$/.test(dep)) {
        mod.cjsWrapper = true;
      }
      // 解析依赖模块, 如已经exports则更新mod.depExports.
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

  forEach(mod.depExports, function(depExport, index) {
    if (depExport === require) {
      mod.depExports[index] = requireInContext;
      return break_obj;
    }
  });

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

  mod.setStatus(Module.STATUS.complete);

  // 删除回调函数
  if (!kerneljs.config.debug) {
    delete mod.factory;
  }
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

// 正则提取代码中的 `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// 去掉源码中的注释
    commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// 初始化的空模块
var empty_mod = {
  id: null,
  uid: null,
  url: null,
  status: null,
  exports: {}
};

// ID相同的错误消息
var SAME_ID_MSG = 'more then one module defined with the same id: %s';

/**
 * 若两个模块id相同则报错
 */
function exist_id_error(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

/**
 * 全局define函数. 函数签名:
 * define(id?, dependencies?, factory);
 * 见: https://github.com/amdjs/amdjs-api/blob/master/AMD.md#define-function-
 * @param {String|Array|Function|Object} id 模块id
 * @param {Array|Function|Object} deps      依赖模块
 * @param {(Function|Object)?} factory      回调函数
 */
function define(id, deps, factory) {
  var mod, cache = kerneljs.cache,
      uid = uidprefix + uuid++;

  // doc.currentScript在异步情况下比如事件处理器或者setTimeout返回错误结果.
  // 但如果不是这种情况且遵循每个文件一个define模块的话这个属性就能正常工作.
  var uri = getCurrentScriptPath();

  // 处理参数
  if (typeOf(id) !== 'string') {
    factory = deps;
    deps = id;
    id = null;
  }

  if (typeOf(deps) !== 'array') {
    factory = deps;
    deps = null;
  }

  // 缓存path2uid
  if (cache.path2uid[uri]) {
    cache.path2uid[uri].push(uid);
  } else {
    cache.path2uid[uri] = [uid];
  }

  // CommonJS
  if (!deps && typeOf(factory) === 'function') {
    deps = [];
    // Remove comments from the callback string,
    // look for require calls, and pull them into the dependencies,
    // but only if there are function args.
    if (factory.length) {
      factory
        .toString()
        .replace(commentRegExp, '')
        .replace(cjsRequireRegExp, function(match, quote, dep) {
          deps.push(dep);
        });

      // May be a CommonJS thing even without require calls, but still
      // could use exports, and module. Avoid doing exports and module
      // work though if it just needs require.
      // REQUIRES the function to expect the CommonJS variables in the
      // order listed below.
      deps = (factory.length === 1 ?
        ['require'] : ['require', 'exports', 'module']).concat(deps);
    }
  }

  // 只有当用户自定义的id存在时
  if (id) {
    // 只在开发时报同一id错误 todo 通过工程化工具解决
    // 打包时由于require.async的使用造成层级依赖模块的重复是有可能存在的, 并且S.O.I
    // 也没有很好解决. 当非首屏首页的多个模块又各自依赖或含有第三个非注册过的模块时, 这个
    // 模块会被打包进第二个和第三个package, 这样就有可能在运行时造成同一id多次注册的现象.
    if (cache.mods[id] && kerneljs.debug) {
      emit(events.error, [
        SAME_ID_MSG.replace('%s', id),
        uri
      ]);
      return exist_id_error(id);
    }
    cache.mods[id] = empty_mod;
  }

  // 创建\注册模块
  mod = cache.mods[uid] = new Module({
    uid: uid,
    id: id,
    url: uri,
    deps: deps,
    factory: factory,
    status: Module.STATUS.init
  });
  emit(events.create, [mod]);

  // 打包过后define会先发生, 这种情况script标签不会带有kn_name字段.
  var name = getCurrentScript().kn_name;
  if (name && isTopLevel(name) && !mod.id) {
    mod.id = name;
  }

  // 更新mod.depExports
  mod.resolveDeps();

  // 加载依赖模块
  load(mod);
}

/**
 * 加载依赖模块文件.
 * @param {Object|Module} mod 宿主模块.
 */
function load(mod) {
  var cache = kerneljs.cache,
      count = mod.deps.length,
      inPathConfig = kerneljs.paths && kerneljs.paths[mod.id] ? true : false;

  // 若mod.id在paths中已经配置则相对路径是location.href,
  // 详见: config_path_relative test case.
  var currentPath = inPathConfig ? loc.href : (mod.url || getCurrentScriptPath());

  // 更新fetchingList.
  fetchingList.add(mod);

  // Register module in global cache with an empty.
  // export for later checking if its status is available.
  if (!cache.mods[mod.uid]) {
    cache.mods[mod.uid] = empty_mod;
  }

  // 更新模块状态
  mod.setStatus(Module.STATUS.fetching);

  forEach(mod.deps, function(name, index) {
    // 模块更新depExports之后, 预置的模块和已经导出的模块均已可用.
    // 尤其构建合并js文件后会是这种情况.
    if (mod.depExports[index]) {
      --count;
      return;
    }

    // else it's a real file path. get its responding uid
    var path = resolvePath(name, currentPath);
    var uid = cache.path2uid[path];

    // 如果加载模块的请求已经发出但模块没加载完成, 模块的状态是`fetching`.
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (uid && cache.mods[uid[0]] &&
      (cache.mods[uid[0]].status === Module.STATUS.complete ||
        checkCycle(path, mod))) {
      --count;
      mod.depExports[index] = cache.mods[uid[0]].exports;
      return;
    }

    // It's a user-defined or not been fetched file.
    // If it's a user-defined id and not config in global alias,
    // it will produce a 404 error.
    // record this mod depend on the dep current now.
    if (!dependencyList[path]) {
      dependencyList[path] = [mod];
    } else if (indexOf(dependencyList[path], mod) < 0) {
      dependencyList[path].push(mod);
    }

    if (!sendingList[path]) {
      sendingList[path] = true;
      // 加载模块
      fetch(path, name, noop);
    }
  });

  // If all module have been cached.
  // In notify, mod will be removed from fetchingList
  if (count === 0) {
    notify(mod);
  }
}

/**
 * 一般作为页面逻辑的入口, 提倡js初始化只调用一次require.
 * 函数内部的异步加载用require.async. 两种使用方式:
 * a. var mod = require('widget/a');
 * b. require(['widget/a'], function(wid_a) {
 *      wid_a.init();
 *    });
 * @param {!Array} deps
 * @param {Function?} cb
 */
function require(deps, cb) {
  var argLen = arguments.length;
  // 传入配置对象
  if (typeOf(deps) === 'object' && argLen === 1) {
    kerneljs.config(deps);
    return;
  }

  // 无依赖
  if (typeOf(deps) === 'array' && deps.length === 0) {
    return typeOf(cb) === 'function' ? cb() : cb;
  }

  var uri = getCurrentScriptPath();

  if (typeOf(deps) === 'string' && argLen === 1) {
    requireDirectly(deps, uri);
  } else {
    if (typeOf(cb) !== 'function') {
      throw 'Global require\'s args TypeError.';
    }
    // 为`require`的调用生成一个匿名模块, 分配其uid且id为null
    var mod = new Module({
      uid: uidprefix + uuid++,
      id: null,
      url: uri,
      deps: deps,
      factory: cb,
      status: Module.STATUS.init
    });

    // 更新mod.depExports
    forEach(deps, function(dep, index) {
      // 得到依赖的绝对路径
      var path = resolvePath(dep, uri);
      mod.depExports[index] = resolve(dep) || resolve(path);
    });

    load(mod);
  }
}

/**
 * 调用require的方式是`require('xxx')`
 * @param {String} id 请求的模块id
 * @param {String} baseUri 解析请求模块需要的base网路地址
 * @returns {?Module|Object} 返回请求模块
 */
function requireDirectly(id, baseUri) {
  // 如果依赖css.
  var isCss = (id.indexOf('.css') === id.length - 4);
  if (isCss) {
    return {};
  }

  var realPath = resolvePath(id, baseUri);
  // a simple require statements always be resolved preload.
  // so return its exports object.
  var inject = resolve(id);
  if (inject) {
    return inject;
  } else {
    var uid = kerneljs.cache.path2uid[realPath][0];
    return kerneljs.cache.mods[uid].exports || null;
  }
}

/**
 * 当一个模块已经准备就绪, 意味着它的所有以来全部都加载完毕并且回调函数
 * 已经执行完毕. 在此通知依赖于此模块的其他模块.
 * @param {Module} mod 已完毕的模块对象
 */
function notify(mod) {
  fetchingList.remove(mod);
  mod.exec();

  // 注册
  kerneljs.cache.mods[mod.uid] = mod;
  if (mod.id) {
    kerneljs.cache.mods[mod.id] = mod;
  }

  // 通知依赖项.
  var depandants = dependencyList[mod.url];
  if (depandants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[mod.url];
    forEach(depandants, function(dependant) {
      if (dependant.ready && dependant.status === Module.STATUS.fetching) {
        dependant.ready(mod);
      }
    });
  }
}

/**
 * Used in the CommonJS wrapper form of define a module.
 * @param {String} name
 * @param {?Module=} mod Pass-in this argument is to used in a cjs
 *   wrapper form, if not we could not refer the module and exports
 * @return {Object}
 */
function resolve(name, mod) {
  // step 1: parse built-in and already existed modules
  if (kerneljs.cache.mods[name]) {
    var currentScriptPath = getCurrentScriptPath(),
        path = resolvePath(name, currentScriptPath);
    // we check circular reference first, if it there, we return the
    // empty_mod immediately.
    if (kerneljs.cache.mods[name].status === Module.STATUS.complete ||
        checkCycle(path, mod)) {
      return kerneljs.cache.mods[name].exports;
    }
  }

  // step 2: cjs-wrapper form
  if (name === 'require') {
    return require;
  } else if (name === 'module') {
    return mod;
  } else if (name === 'exports') {
    return mod && mod.exports;
  }

  return null;
}

/**
 * A mechanism to check cycle reference.
 * More about cycle reference can be solved by design pattern, and a
 * well-designed API(Architecture) can avoid this problem, but in case
 * it happened, we do the same thing for dojo loader and specification
 * written on RequireJS website. See:
 *  'http://requirejs.org/docs/api.html#circular'
 *   and
 *  'http://dojotoolkit.org/documentation/tutorials/1.9/modules_advanced/'
 *
 * todo only simple cycle refer done here
 * @param {String} path A file path that contains the fetching module.
 *     We should resolve the module with url set to this dep and check its
 *     dependencies to know whether there  produce a cycle reference.
 * @param {Module|Object} mod current parse module.
 * @return {Boolean} true if there has a cycle reference and vice versa.
 */
function checkCycle(path, mod) {
  var ret = false;
  var uid = kerneljs.cache.path2uid[path];
  var m;
  if (uid && (m = kerneljs.cache.mods[uid[0]])) {
    if (indexOf(dependencyList[mod.url], m) >= 0) {
      ret = true;
    }
  }

  return ret;
}

/**
 * Resolve path of the given id.
 * @param {String} id
 * @return {!(String|Object)}
 */
require.toUrl = function(id) {
  return resolvePath(id);
};

/**
 * Used to Load module after page loaded.
 * @param {!String} id Identifier or path to module.
 * @param {!Function} callback Factory function.
 */
require.async = function(id, callback) {
  require([id], callback);
};

/**
 * define.amd property, conforms to the AMD API.
 * @typedef {Object}
 */
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};

/**
 * 全局kerneljs对象
 */
var kerneljs = {};

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
 * @typedef {Object}
 */
var sendingList = {};

// 订阅者缓存
var handlersMap = {};

/**
 * 动态配置kerneljs对象. 目前配置对象的属性可以是:
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
  // mods记录所有的模块. 在开发时不提倡自己写id但实际也可以自己写,
  // 没啥意义因为请求还是以路径来做. 可以通过paths配置来require短id, 这个缓存对象
  // 在开发时会有不少缺失的模块, 但在打包后id已经自生成所以它会记录完全.
  // 全局缓存uid和对应模块. 是一对一的映射关系.
  mods: {},
  // 理论上每个文件可能定义多个模块，也就是define了多次。这种情况应该在开发时严格避免，
  // 但经过打包之后一定会出现这种状况。所以我们必须要做一些处理，也使得这个结构是一对多的.
  path2uid: {}
};

/**
 * 重置全局缓存
 */
kerneljs.reset = function() {
  this.cache.mods = {};
  this.cache.path2uid = {};
  handlersMap = {};
};

/**
 * 区分开发环境和部署环境资源地址定位，便于构建时分析。
 * @param {!String} url 相对于本次js模块的地址
 * @returns {!String} 返回线上绝对路径的地址
 */
kerneljs.url = function(url) {
  return url;
};

kerneljs.on = on;
kerneljs.emit = emit;
kerneljs.eventsType = events;

/** 全局导出 APIs */
global.require = global.__r = require;
global.define = global.__d = define;
global.kerneljs = kerneljs;

// 基础配置
kerneljs.config({
  baseUrl: '',
  debug: true,
  paths: {}
});

/**
 * 内部分发的事件名称
 * @typedef {Object}
 */
var events = {
  create: 'create',
  fetch: 'fetch',
  endFetch: 'end:fetch',
  complete: 'complete',
  error: 'error'
};

/**
 * 订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Function} handler 事件处理器
 * @param {*} context 事件处理器上下文
 */
function on(eventName, handler, context) {
  if (!handlersMap[eventName]) {
    handlersMap[eventName] = [];
  }
  handlersMap[eventName].push({
    handler: handler,
    context: context
  });
}

/**
 * 触发订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Array.<Object>} args 参数
 */
function emit(eventName, args) {
  // 缓存防止事件处理器改变kerneljs.cache对象
  var arr = handlersMap[eventName];
  if (arr) {
    forEach(arr, function(obj) {
      obj.handler.apply(obj.context, args);
    });
  }
}

}(this));
