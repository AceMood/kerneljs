/**
 * Author:  AceMood
 * Email:   zmike86@gmail.com
 * Version: 1.0.0
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
/**
 * @file DOM relative ops
 * @email zmike86@gmail.com
 */

var resArr = [
  'Trident\/([^ ;]*)',
  'AppleWebKit\/([^ ;]*)',
  'Opera\/([^ ;]*)',
  'rv:([^ ;]*)(.*?)Gecko\/([^ ;]*)',
  'MSIE\s([^ ;]*)',
  'AndroidWebKit\/([^ ;]*)'
];
var engineRe = new RegExp(resArr.join('|')),
  engine = navigator.userAgent.match(engineRe) || 0,
  curStyle, curSheet;

// load css through @import directive
// IE < 9, Firefox < 18
var useImportLoad = false,
// 采用onload事件在webkit下会有问题，此时设成false
  useOnload = true;

// trident / msie
if (engine[1] || engine[7]) {
  useImportLoad = engine[1] < 6 || engine[7] <= 9;
  // webkit
} else if (engine[2] || engine[8]) {
  useOnload = false;
  // gecko
} else if (engine[4]) {
  useImportLoad = engine[4] < 18;
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
  } else {
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
      link.onload = null;
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
// IE6 bug, 有base元素的情况下head.appendChild容易出错in jQuery.
// See: 'http://dev.jquery.com/ticket/2709'
  $base = $doc.getElementsByTagName('base')[0];

if ($base) {
  $head = $base.parentNode;
}

// current adding script node
var currentAddingScript,
// Old Firefox don't support script.readyState, so we only use this prop
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
 * @param {string} url 文件路径
 * @param {function} callback
 */
function fetchCss(url, callback) {
  function onCssLoad() {
    var mod,
      cache = kerneljs.cache,
      uid = uidprefix + uuid++;
    var base = url;

    // 缓存path2uid
    if (cache.path2id[base]) {
      cache.path2id[base].push(uid);
    } else {
      cache.path2id[base] = [uid];
    }

    // 创建模块
    mod = cache.mods[uid] = new Module({
      uid: uid,
      id: null,
      url: url,
      deps: [],
      factory: null,
      status: Module.STATUS.complete
    });
    emit(events.create, [mod]);

    // 打包过后define会先发生, 这种情况script标签不会带有kn_name字段.
    if (name && isTopLevel(name) && !mod.id) {
      mod.id = name;
    }

    ready(mod);
  }

  var method = (useImportLoad ? importLoad : linkLoad);
  method(url, onCssLoad);
}

/**
 * @param {string} url script src
 * @param {function} callback
 */
function fetchScript(url, callback) {
  function onScriptLoad() {
    if (!script.readyState || /complete/.test(script.readyState)) {
      interactiveScript = null;
      script.onreadystatschange = script.onload = script.onerror = null;
      // Remove the script to reduce memory leak
      if (!kerneljs.data.debug) {
        $head.removeChild(script);
      }
      script = null;
      callback();
    }
  }

  var script = $doc.createElement('script');
  script.charset = 'utf-8';
  script.async = 1;

  // event listener
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
 * @param {string} url 文件路径
 * @param {function} callback
 */
function fetch(url, callback) {
  if (url.indexOf('.css') === url.length - 4) {
    fetchCss(url, callback);
  } else {
    fetchScript(url, callback);
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
/**
 * @file paths utilities
 * @email zmike86@gmail.com
 */

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
 * When multiple slashes are found, they're replaced by a single one;
 * when the path contains a trailing slash, it is preserved.
 * On Windows backslashes are used in FileSystem.
 *
 * Example:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 * @param {string} p
 */
function normalize(p) {
  // step1: combine multi slashes
  p = p.replace(/(\/)+/g, slash);

  // step2: resolve '.' and '..'
  p = resolveDot(p);
  return p;
}

/**
 * Resolve relative path such as '.' or '..'.
 * @param {string} p
 * @return {string}
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
 * @param  {string} p Path to check.
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
 * Here we think topLevel path is a kind of relative path.
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
 * @param  {string} id 依赖模块的name或者id。
 * @param  {string=} base 作为baseUri，解析依赖模块的绝对路径。
 * @return {string|object} exports object or absolute file path from Internet
 */
function resolvePath(id, base) {
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
 * Similar to the UNIX dirname command.
 * Usage:
 * dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} p
 * @return {string}
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
  var paths = kerneljs.data.paths;
  if (paths) {
    var part = p;
    var parts = p.split(slash);
    while (!(part in paths) && parts.length) {
      ret.unshift(parts.pop());
      part = parts.join(slash);
    }
    p = paths[part] ? paths[part] : part;
  }
  return p + ret.join(slash);
}

/**
 * package名称配置也会影响路径解析.
 * 在paths解析后, 需要处理package configuration.
 * @param {String} p
 * @return {String} s
 */
function parsePackages(p) {
  var pkgs = kerneljs.data.packages,
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
  this.status = Module.STATUS.init;
  this.factory = obj.factory || null;
  this.exports = {};

  // cache
  Module._cache[this.id] = this;
  this.setStatus(Module.STATUS.init);
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
  var ok = true;
  // native forEach will skip nullify value, when exports is
  // an empty string, it will break, so use a for loop
  for (var i = 0; i < this.deps.length; ++i) {
    var dependency = resolve(this.deps[i], this);
    if (!dependency || (dependency.status < Module.STATUS.loaded)) {
      ok = false;
      break;
    }
  }
  return ok;
};

/**
 * compile module
 */
Module.prototype.compile = function() {
  if (this.status === Module.STATUS.complete) {
    return;
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
    if (mod && (mod.status >= Module.STATUS.loaded)) {
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
    var type = typeOf(id);
    if (type === 'string') {
      requireAsync([id], callback);
    } else if (type === 'array') {
      requireAsync(id, callback);
    }
  };

  var self = this;
  this.factory.call(null, localRequire, this.exports, this);
  delete this.factory;
  this.setStatus(Module.STATUS.complete);
};

/**
 * Module's status:
 *  init:     created with `new` operator.
 *  fetching: loading dependencies script.
 *  loaded:   all dependencies are ready.
 *  complete: after compiled.
 */
Module.STATUS = {
  'init'      : 0,
  'fetching'  : 1,
  'loaded'    : 2,
  'complete'  : 3
};

// cache for module
// id-module key-pairs
Module._cache = {};

// extract `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g,
// remove line/block comments
  commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

/** same module Id error */
function exist_id_error(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

/**
 * global define.
 * define(id?, factory);
 * @param {string|function|object} id module Id
 * @param {(function|object)?} factory callback function
 */
function define(id, factory) {
  var mod;
  var resourceMap = kernel.data.resourceMap,
    inMap = resourceMap && resourceMap[id];

  // If module in resourceMap, get its uri property.
  // doc.currentScript is not always available.
  var uri = inMap ? resourceMap[id].uri : getCurrentScriptPath();
  var deps = inMap ? resourceMap[id].deps : [];

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) === 'object') {
    mod = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: null
    });

    mod.exports = factory;
    mod.setStatus(Module.STATUS.complete);
    ready(mod);
  } else if (typeOf(factory) === 'function') {
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function (match, quote, dep) {
        deps.push(dep);
      });

    mod = new Module({
      id: id,
      uri: uri,
      deps: deps,
      factory: factory
    });

    loadDependency(mod);
  } else {
    throw 'define with wrong parameters in ' + uri;
  }

  // cache in path2id
  if (kernel.path2id[uri]) {
    kernel.path2id[uri].push(mod.id);
  } else {
    kernel.path2id[uri] = [mod.id];
  }
}

/**
 * Load module's dependencies.
 * @param {Module} mod Module object.
 */
function loadDependency(mod) {
  var cnt = mode.deps.length;
  // Update fetchingList.
  fetchingList.add(mod);
  mod.setStatus(Module.STATUS.fetching);

  forEach(mod.deps, function(name) {
    var resourceMap = kernel.data.resourceMap;
    var uri, id;
    // already record through build tool
    if (resourceMap && resourceMap[name]) {
      uri = resourceMap[name].uri;
      id = resourceMap[name].id;
    } else {
      uri = resolvePath(name, mod.uri);
      id = kernel.path2id[path] ? kernel.path2id[path][0] : null;
    }

    var dependencyModule = id && Module._cache[id];
    if (dependencyModule &&
      (dependencyModule.status === Module.STATUS.complete)) {
      cnt--;
      return;
    }

    // record this mod and dependency in dependencyList right now.
    // for notify later.
    if (!dependencyList[uri]) {
      dependencyList[uri] = [mod];
    } else if (indexOf(dependencyList[uri], mod) < 0) {
      dependencyList[uri].push(mod);
    }

    if (!sendingList[uri]) {
      sendingList[uri] = true;
      // load script or style
      fetch(uri, name, noop);
    }
  });

  if (cnt === 0) {
    ready(mod);
  }
}

/**
 * 当一个模块已经准备就绪, 意味着它的所有以来全部都加载完毕并且回调函数
 * 已经执行完毕. 在此通知依赖于此模块的其他模块.
 * @param {Module} mod 已完毕的模块对象
 */
function ready(mod) {
  fetchingList.remove(mod);
  mod.setStatus(Module.STATUS.loaded);

  // Inform all module that depend on this current module.
  var dependants = dependencyList[mod.uri];
  if (dependants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[mod.url];
    forEach(dependants, function(dependant) {
      if (dependant.status === Module.STATUS.fetching) {
        if (dependant.checkAll()) {
          ready(dependant);
        }
      }
    });
  }
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} id moduleId or relative path
 * @param  {?Module=} mod for calculate path.
 * @return {object}
 */
function resolve(id, mod) {
  var path = resolvePath(id, (mod && mod.uri) || getCurrentScriptPath());
  return Module._cache[id] || Module._cache[kernel.path2id[path][0]];
}

// define.amd property, conforms to the AMD API.
define.amd = {
  creator: 'AceMood',
  email: 'zmike86@gmail.com'
};
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
 * Stores all modules that is fetching.
 * Use module's uid and module as key-pairs.
 */
var fetchingList = {
  mods: {},
  add: function(mod) {
    if (this.mods[mod.uid]) {
      emit(
        events.error,
        [
          'current mod with uid: ' + mod.uid + ' and file path: ' +
          mod.url + ' is fetching now'
        ]
      );
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
// module's uid as the key of dependencyList, so we use url here, module
// self as value.
var dependencyList = {};

/**
 * 如果某个模块处于fetching的状态则说明依赖的js模块文件正在下载，在完成下载之前我们
 * 不希望同一个文件发起两次下载请求。define时会缓存到cache.path2uid对象中，我们这里
 * 用path作为key标识模块文件正在下载
 */
var sendingList = {};

/**
 * Config kernel object at any time. Options:
 * --baseUrl:     All relative paths should be resolved base on this uri
 * --resourceMap: All pre-built-in modules and dependencies. If a module has been
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

// clear all relative cache
kernel.reset = function() {
  Module._cache = {};
  this.path2id = {};
  this.data = {};
  handlersMap = {};
};

kernel.config = config;
kernel.on = on;
kernel.emit = emit;
kernel.request = fetchScript;
kernel.eventsType = events;
kernel.data = {};
// 理论上每个文件可能定义多个模块，也就是define了多次。这种情况应该在开发时严格避免，
// 但经过打包之后一定会出现这种状况。所以我们必须要做一些处理，也使得这个结构是一对多的.
kernel.path2id = {};

// Global APIs
global.define = global.__d = define;
global.require = global.__r = requireGlobal;
global.kerneljs = kernel;

// config with preserved global kerneljs object
kernel.config(kernel._kernel);
/**
 * @file take care of kerneljs event publish and subscribe
 * @email zmike86@gmail.com
 * @preserved
 */

// handles cache map
var handlersMap = {};

// event names
var events = {
  create: 'create',
  fetch: 'fetch',
  loaded: 'loaded',
  complete: 'complete',
  error: 'error'
};

/**
 * subscribe
 * @param {string} eventName
 * @param {function} handler
 * @param {*} context handler's context
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
 * trigger event
 * @param {string} eventName
 * @param {Array.<object>} args callback parameters
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
/**
 * @file logs utilities
 * @email zmike86@gmail.com
 * @preserved
 */

on('create', function(mod) {
  console.log('Create on:    ' + mod.url);
});

on('start:fetch', function(mod) {
  console.log('Fetch for:    ' + mod.url);
});

on('complete', function(mod) {
  console.log('Complete on:  ' + mod.url);
});

}(this));
