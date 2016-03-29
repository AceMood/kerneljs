/**
 * Author:  AceMood
 * Email:   zmike86@gmail.com
 * Version: 1.0.2
 */

/**
 * ==================================================================
 * browser code in development
 *
 * JavaScript is a powerful object oriented language with some of the
 * fastest dynamic language interpreters around. The official JavaScript
 * specification defines APIs for some objects that are useful for building
 * browser-based applications. However, the spec does not define a standard
 * library that is useful for building a broader range of applications.
 *
 * I . The CommonJS API will fill that gap by defining APIs that handle many
 * common application needs, ultimately providing a standard library as rich
 * as those of Python, Ruby and Java. The intention is that an application
 * developer will be able to write an application using the CommonJS APIs
 * and then run that application across different JavaScript interpreters
 * and host environments. With CommonJS-compliant systems, you can use
 * JavaScript to write:

 * 1. Server-side JavaScript applications
 * 2. Command line tools
 * 3. Desktop GUI-based applications
 * 4. Hybrid applications (Titanium, Adobe AIR)
 *
 * II. The Asynchronous Module Definition (AMD) API specifies a mechanism
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
 * "http://wiki.commonjs.org/wiki/CommonJS"
 * "https://github.com/amdjs/amdjs-api/wiki/AMD"
 */

(function (global, undefined) {

'use strict';
/**
 * @file utility functions
 * @email zmike86@gmail.com
 */

var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;

// use such an object to determine cut down a forEach loop;
var break_obj = {};

/** noop function as callback */
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
 * Search for specific item in an array.
 * @param {Array} arr search array
 * @param {*} tar target object
 * @return {number} position index based from Zero
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
 * @type {object}
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
 * object Type, see typeMap
 */
function typeOf(obj) {
  return typeMap[toString.call(obj)];
}
/**
 * @file DOM JS API relative ops
 * @email zmike86@gmail.com
 */

var $doc = document;
var $head = $doc.head || $doc.getElementsByTagName('head')[0];
// IE6 bug, when a base element exists, head.appendChild goes wrong.
// See: 'http://dev.jquery.com/ticket/2709'
var $base = $doc.getElementsByTagName('base')[0];

if ($base) {
  $head = $base.parentNode;
}

// current adding script node
var currentAddingScript,
// Old Firefox don't support script.readyState, so we only use this prop
// in IEs. Although 'onload' in IE9 & IE10 have problems, but do not
// care the issue, and whatever async is true or false. We just
// remove node in document as the callback of javascript loaded.
// See more info about the bug:
// 'https://connect.microsoft.com/IE/feedback/details/729164/ie10-dynamic-script-element-fires-loaded-readystate-prematurely'
// 'https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution'
  useInteractive = ('readyState' in $doc.createElement('script')),
// loop all script nodes in doc, if one readyState is 'interactive'
// means it's now executing;
  interactiveScript;

// Store callback list map to same url
var callbacksList = {};

/**
 * @param {string} url css href
 */
function fetchCss(url) {
  function onCssLoad() {
    sendingList[url] = false;

    var mod = new Module({
      uri: url
    });

    // update path2uid
    recordPath2Id(url, mod.id);
    ready(mod);
    var callbacks = callbacksList[url];
    forEach(callbacks, function(cb) {
      cb();
    });
  }

  var method = (useImportLoad ? importLoad : linkLoad);
  method(url, onCssLoad);
}

/**
 * @param {string} url
 * @param {function} callback
 */
function addOnLoad(url, callback) {
  if (!callbacksList[url]) {
    callbacksList[url] = [];
  }
  callbacksList[url].push(callback);
}

/**
 * @param {string} url script src
 */
function fetchScript(url) {
  function onScriptLoad() {
    if (!script.readyState || /complete/.test(script.readyState)) {
      interactiveScript = null;
      script.onreadystatschange = script.onload = script.onerror = null;
      script = null;
      sendingList[url] = false;
      var callbacks = callbacksList[url];
      forEach(callbacks, function(cb) {
        cb();
      });
    }
  }

  var script = $doc.createElement('script');
  script.charset = 'utf-8';
  script.async = 1;
  script.crossorigin = 1;

  // event listener
  script.onreadystatechange = script.onload = script.onerror = onScriptLoad;

  // old IE(<11) will load javascript file once script.src has been set,
  // script.readyState will become `loaded` when file loaded(but not executed),
  // script.readyState will become `complete` after code evaluated.
  // IE11 removed this feature.
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
 * fetch script or css file
 * @param {string} url resource url
 * @param {function} callback
 */
function fetch(url, callback) {
  if (sendingList[url] === void 0) {
    sendingList[url] = true;
    addOnLoad(url, callback);
    if (url.indexOf('.css') === url.length - 4) {
      fetchCss(url);
    } else {
      fetchScript(url);
    }
  } else if (sendingList[url]) {
    addOnLoad(url, callback);
  } else if (sendingList[url] === false) {
    callback();
  }
}

/**
 * get all script elements in current document
 * @return {NodeList}
 */
function scripts() {
  return $head.getElementsByTagName('script');
}

/**
 * Current executing script element.
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
 * @return {string}
 */
function getAbsPathOfScript(script) {
  return script.hasAttribute ? script.src : script.getAttribute('src', 4);
}

/**
 * Get current executing script absolute src.
 * Return null if node is undefined.
 * @return {?string}
 */
function getCurrentScriptPath() {
  var node = getCurrentScript();
  return node ? getAbsPathOfScript(node) : null;
}
/**
 * @file DOM CSS relative ops
 * @email zmike86@gmail.com
 */

var reg = [
  'Trident\/([^ ;]*)',
  'AppleWebKit\/([^ ;]*)',
  'Opera\/([^ ;]*)',
  'rv:([^ ;]*)(.*?)Gecko\/([^ ;]*)',
  'MSIE\s([^ ;]*)',
  'AndroidWebKit\/([^ ;]*)'
];

var engineRe = new RegExp(reg.join('|'));
var engine = navigator.userAgent.match(engineRe) || 0;
var curStyle, curSheet;

// load css through @import directive
// IE < 9, Firefox < 18
var useImportLoad = false,
// onload break in webkit
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
 * Create style element to import css module
 * @param {string} url css href
 * @param {function} callback
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
      } catch(e) { }
    }, 10);
  }
}

/**
 * create link element and listen for onload
 * @param {string} url css href
 * @param {function} callback
 */
function linkLoad(url, callback) {
  var loop = function() {
    for (var i = 0; i < $doc.styleSheets.length; i++) {
      var sheet = $doc.styleSheets[i];
      if (sheet.href === link.href) {
        clearTimeout(loadInterval);
        return callback();
      }
    }
    loadInterval = setTimeout(loop, 10);
  };
  // link
  var link = $doc.createElement('link');
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
 * create style element
 */
function createStyle() {
  curStyle = $doc.createElement('style');
  $head.appendChild(curStyle);
  curSheet = curStyle.styleSheet || curStyle.sheet;
}
/**
 * @file paths utilities
 * @email zmike86@gmail.com
 */

// A directory file path must be ends with a slash (back slash in window)
var dirRegExp = /\/$/g;
var fileExtRegExp = /\.(js|css|txt)$/;
var dot = '.';
var slash = '/';
var dot2 = '..';

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
 * e.g:
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
 * @param  {string} id 依赖模块的name或者id。
 * @param  {string=} base 作为baseUri，解析依赖模块的绝对路径。
 * @return {string|object} exports object or absolute file path from Internet
 */
function resolvePath(id, base) {
  if (isTopLevel(id)) {
    // normalize id and parse head part as paths
    id = parsePaths(id);
    // here if a top-level path then relative base change to
    // current document's baseUri.
    base = null;
  }

  // add file extension if necessary
  id = normalize(id);
  var adjoin = id.charAt(0) === slash ? '' : slash;
  var url = (base ? dirname(base) : dirname(loc.href)) + adjoin + id;

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
 * Search in kernel.data.paths configuration.
 * @param {string} p 依赖模块路径
 * @return {string} s 替换后的路径
 */
function parsePaths(p) {
  var ret = [];
  var paths = kernel.data.paths;
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
 * @file Module Class
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
  // user defined id
  if (obj.id) {
    if (Module._cache[obj.id]) {
      emit(
        events.error,
        [
          SAME_ID_MSG.replace('%s', obj.id),
          obj.uri
        ]
      );
      return existIdError(obj.id);
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
    throw 'Status ' + status + ' is now allowed.';
  } else if (status === 0) {
    this.status = status;
    emit(events.create, [this]);
  } else if (status === 1) {
    this.status = status;
    emit(events.fetch, [this]);
  } else if (status === 2) {
    this.status = status;
    emit(events.loaded, [this]);
  } else if (status === 3) {
    this.status = status;
    emit(events.complete, [this]);
  }
};

/**
 * Inform current module that one of its dependencies has been loaded.
 * @return {boolean}
 */
Module.prototype.checkAll = function() {
  return this.depsCount === 0;
};

/**
 * compile module
 * @return {*} module's exports object
 */
Module.prototype.compile = function() {
  if (this.status === Module.Status.complete) {
    return this.exports;
  }

  /**
   * require has two approaches:
   * a. var mod = require('widget/a');
   * b. require.async(['widget/a'], function(wid_a) {
   *      wid_a.init();
   *    });
   * @param {!string} name module Id or relative path
   */
  function localRequire(name) {
    var argLen = arguments.length;
    if (argLen < 1) {
      throw 'require must have at least one parameter.';
    }

    // a simple require statements always be preloaded.
    // so return its complied exports object.
    var mod = resolve(name, self.uri);
    if (mod && (mod.status >= Module.Status.loaded)) {
      mod.compile();
      return mod.exports;
    } else {
      throw 'require unknown module with id: ' + name;
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
   * @param {string|Array} id moduleId or dependencies names.
   * @param {function} callback callback function.
   */
  localRequire.async = function(id, callback) {
    if (typeOf(callback) !== 'function') {
      throw 'require.async second parameter must be a function';
    }

    var deps = [];
    var type = typeOf(id);
    if (type === 'string') {
      deps = [id];
    } else if (type === 'array') {
      deps = id;
    }

    var anon = new AnonymousModule({
      uri: self.uri,
      deps: deps,
      factory: callback
    });
    requireAsync(noop, anon);
  };

  var self = this;
  // css module not have factory
  if (this.factory) {
    this.factory.apply(null, [localRequire, this.exports, this]);
    delete this.factory;
  }
  this.setStatus(Module.Status.complete);
  return this.exports;
};

/**
 * Module's status:
 *  init:     created with `new` operator.
 *  fetching: loading dependencies script.
 *  loaded:   all dependencies are ready.
 *  complete: after compiled.
 */
Module.Status = {
  'init'      : 0,
  'fetching'  : 1,
  'loaded'    : 2,
  'complete'  : 3
};

// cache for module
// id-module key-pairs
Module._cache = {};
/**
 * @file Anonymous Module Class represents require.async calls
 * @email zmike86@gmail.com
 */

/**
 * @class
 * @param {object} obj Configuration object. Include:
 *                     --uri: 模块对用的物理文件路径
 *                     --deps: dependency array, which stores moduleId or relative module path.
 *                     --factory: callback function
 *                     --status: Module.Status
 */
function AnonymousModule(obj) {
  this.uid = uidprefix + uuid++;
  this.id = obj.id || this.uid;
  this.uri = obj.uri;
  this.deps = obj.deps || [];
  this.depsCount = this.deps.length;
  this.status = Module.Status.init;
  this.factory = obj.factory || null;

  this.setStatus(Module.Status.init);
}

/**
 * Set module's status
 * @param {number} status
 */
AnonymousModule.prototype.setStatus = Module.prototype.setStatus;

/**
 * Inform current module that one of its dependencies has been loaded.
 * @return {boolean}
 */
AnonymousModule.prototype.checkAll = Module.prototype.checkAll;

/**
 * compile module
 */
AnonymousModule.prototype.compile = function() {
  if (this.status === Module.Status.complete) {
    return;
  }

  var mod = this;
  var args = [];

  forEach(mod.deps, function(name) {
    //var ret = buildIdAndUri(name, mod.uri);
    //var dependencyModule = ret.id && Module._cache[ret.id];
    var dependencyModule = resolve(name, mod.uri);
    if (dependencyModule &&
      (dependencyModule.status >= Module.Status.loaded)) {
      args.push(dependencyModule.compile());
    }
  });

  this.factory.apply(null, args);
  delete this.factory;
  this.setStatus(Module.Status.complete);
};

// extract `require('xxx')`
var cjsRequireRegExp = /\brequire\s*\(\s*(["'])([^'"\s]+)\1\s*\)/g;
// remove line/block comments
var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

var SAME_ID_MSG = 'more then one module defined with the same id: %s';

// Due to add module dependency when resolve id->path, we can not use
// module's uid as the key of dependencyList, so we use url here, module
// self as value.
var dependencyList = {};

// Store for which module is being fetched.
var sendingList = {};

// same module Id error
function existIdError(id) {
  throw SAME_ID_MSG.replace('%s', id);
}

// record cache in path2id
function recordPath2Id(uri, id) {
  if (kernel.path2id[uri]) {
    kernel.path2id[uri].push(id);
  } else {
    kernel.path2id[uri] = [id];
  }
}

// record this mod and dependency in dependencyList right now.
// for notify later.
function recordDependencyList(uri, module) {
  if (!dependencyList[uri]) {
    dependencyList[uri] = [module];
  } else if (indexOf(dependencyList[uri], module) < 0) {
    dependencyList[uri].push(module);
  }
}

// expect module have been pre-build, try to resolve id & uri
function buildIdAndUri(name, baseUri) {
  var resourceMap = kernel.data.resourceMap;
  var uri, id;
  // already record through build tool
  if (resourceMap && resourceMap[name]) {
    uri = resourceMap[name].uri;
    id = resourceMap[name].id;
  } else if (Module._cache[name]) {
    uri = Module._cache[name].uri;
    id = name;
  } else {
    uri = resolvePath(name, baseUri);
    id = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
  }
  return {
    uri: uri,
    id: id
  };
}

/**
 * Used in the module.compile to determine a module.
 * @param  {string} name moduleId or relative path
 * @param  {?string=} baseUri base for calculate path.
 * @return {?Module}
 */
function resolve(name, baseUri) {
  if (Module._cache[name]) {
    return Module._cache[name];
  }

  var resourceMap = kernel.data.resourceMap;
  var mid, id, uri;
  // already record through build tool
  if (resourceMap && resourceMap[name]) {
    uri = resourceMap[name].uri;
    id = resourceMap[name].id;
    if (Module._cache[id]) {
      return Module._cache[id];
    } else {
      mid = kernel.path2id[uri] ? kernel.path2id[uri][0] : null;
      if (mid && Module._cache[mid]) {
        return Module._cache[mid];
      }
    }
  } else {
    var path = resolvePath(name, baseUri || location.href);
    mid = kernel.path2id[path] ? kernel.path2id[path][0] : null;
    if (mid && Module._cache[mid]) {
      return Module._cache[mid];
    }
  }

  return null;
}

/**
 * Global define|__d function.
 * define(id?, factory);
 * @param {string|function} id module Id or factory function
 * @param {?function=} factory callback function
 */
function define(id, factory) {
  var resourceMap = kernel.data.resourceMap;
  var inMap = resourceMap && resourceMap[id];

  if (typeOf(id) !== 'string') {
    factory = id;
    id = null;
  }

  if (typeOf(factory) !== 'function') {
    throw 'define with wrong parameters ' + factory;
  }

  var uri, deps;
  if (inMap) {
    uri = resourceMap[id].uri;
    deps = resourceMap[id].deps;
  } else {
    uri = getCurrentScriptPath();
    deps = [];
    var requireTextMap = {};
    factory
      .toString()
      .replace(commentRegExp, '')
      .replace(cjsRequireRegExp, function(match, quote, dep) {
        if (!requireTextMap[dep]) {
          deps.push(dep);
          requireTextMap[dep] = true;
        }
      });
  }

  var module = new Module({
    id: id,
    uri: uri,
    deps: deps,
    factory: factory
  });

  // cache in path2id
  recordPath2Id(uri, module.id);
  requireAsync(noop, module);
}

/**
 * When a module is ready, means that all the dependencies have been ready.
 * @param {Module} module
 */
function ready(module) {
  module.setStatus(Module.Status.loaded);
  module.compile();

  // Inform all module that depend on current module.
  var dependants = dependencyList[module.uri];
  if (dependants) {
    // Here I first delete it because a complex condition:
    // if a define occurs in a factory function, and the module whose
    // factory function is current executing, it's a callback executing.
    // which means the currentScript would be mod just been fetched
    // successfully. The url would be the previous one, and we store the
    // record in global cache dependencyList.
    // So we must delete it first to avoid the factory function execute twice.
    delete dependencyList[module.uri];
    forEach(dependants, function(dependant) {
      dependant.depsCount--;
      if (dependant.checkAll() &&
        (dependant.status === Module.Status.fetching)) {
        ready(dependant);
      }
    });
  }
}

/**
 * Internal api to load script async and execute callback.
 * @param {function} callback
 * @param {Module} module
 */
function requireAsync(callback, module) {
  module.setStatus(Module.Status.fetching);
  // no dependencies
  if (module.deps.length === 0) {
    ready(module);
    return;
  }

  forEach(module.deps, function(name) {
    var ret = buildIdAndUri(name, module.uri);
    var dependencyModule = ret.id && Module._cache[ret.id];
   // var dependencyModule = resolve(name, module.uri);
    if (dependencyModule &&
      (dependencyModule.status >= Module.Status.loaded)) {
      module.depsCount--;
      return;
    }

    recordDependencyList(ret.uri, module);
    // load script or style
    fetch(ret.uri, callback);
  });

  // might been loaded through require.async and compiled before
  if (module.checkAll() && module.status < Module.Status.loaded) {
    ready(module);
  }
}
/**
 * @file take care of kernel event publish and subscribe
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
  var arr = handlersMap[eventName];
  if (arr) {
    forEach(arr, function(obj) {
      obj.handler.apply(obj.context, args);
    });
  }
}
/**
 * @file Facade of kerneljs object
 * @email zmike86@gmail.com
 */

var kernel = {};

// for anonymous module Ids
var uuid = 0;
var uidprefix = 'AM@kernel_';

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

// helper function
kernel.getCache = function() {
  return Module._cache;
};

kernel.config = config;
kernel.on = on;
kernel.emit = emit;
kernel.request = fetchScript;
kernel.eventsType = events;
kernel.data = {};
// One javascript file can define more than one module.
// We never do that when dev time. But not after build process.
// Key-value pairs would be path->Array.<id>
kernel.path2id = {};

// config with preserved global kerneljs object
// if a global kerneljs object exists,
// treat it as kerneljs configuration.
if (global.kerneljs) {
  kernel._kernel = global.kerneljs;
  kernel.config(kernel._kernel);
}

// Global APIs
global.define = global.__d = define;
global.kerneljs = kernel;
/**
 * @file logs utilities
 * @email zmike86@gmail.com
 * @preserved
 */

//on('create', function(mod) {
//  console.log('Create on:    ' + mod.uri);
//});
//
//on('fetch', function(mod) {
//  console.log('Fetch for:    ' + mod.uri);
//});

on('loaded', function(mod) {
  console.log('Loaded:    ' + mod.uri);
});

on('complete', function(mod) {
  console.log('Complete on:  ' + mod.uri);
});

}(this));
