
var OP = Object.prototype,
  AP = Array.prototype,
  native_forEach = AP.forEach,
  native_map = AP.map,
  hasOwn = OP.hasOwnProperty,
  toString = OP.toString;


// use such an object to determine cut down a forEach loop;
var break_obj = {};


// initialize a module
var empty_mod = {
  id: null,
  uid: null,
  url: null,
  status: null,
  exports: {}
};


// for no-op function, used for a default callback function
function noop() {}


/**
 * if a module with in the same id exists, then define with the id
 * will fail. we throw an error with useful message.
 */
function exist_id_error(id) {
  throw "more then one module defined with the same id: " + id;
}


/**
 * iterate the array and map the value to a delegation
 * function, use the return value replace original item.
 * @param {Array} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 * @return {!Array}
 */
function map(arr, fn, opt_context) {
  var ret = [];
  if (native_map && arr.map === native_map) {
    ret = arr.map(fn, opt_context);
  } else if (arr.length === +arr.length) {
    for (var i = 0; i < arr.length; ++i) {
      ret.push(fn.call(opt_context || null, arr[i], i, arr));
    }
  }
  return ret;
}


/**
 * NOTE:
 * The forEach function is intentionally generic;
 * it does not require that its this value be an Array object.
 * Therefore it can be transferred to other kinds of objects
 * for use as a method. Whether the forEach function can be applied
 * successfully to a host object is implementation-dependent.
 *
 * @param {Array} arr array to be iterated.
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
 * find a target in an array, return the index or return -1;
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
 * If obj is undefined or null
 * @param obj
 * @return {Boolean}
 */
function isNull(obj) {
  return obj === void 0 || obj === null;
}


var doc = document,
  head = doc.head || doc.getElementsByTagName('head')[0],
  // It's a classical bug in IE6 found in jQuery.
  // see more: 'http://dev.jquery.com/ticket/2709'
  $base = doc.getElementsByTagName('base')[0];

if ($base) {
  head = $base.parentNode;
}

// current adding script node
var currentAddingScript,
// In older FF, do not support script.readyState, so we only use this prop
// in IEs. Although 'onload' in IE9 & IE10 have problems, but I do not
// care the issure, and whatever async is true or false. We just
// remove node in document as the callback of javascript loaded.
// Read more about the bug:
// 'https://connect.microsoft.com/IE/feedback/details/729164/'
// + 'ie10-dynamic-script-element-fires-loaded-readystate-prematurely'
// 'https://connect.microsoft.com/IE/feedback/details/648057/'
// + 'script-onload-event-is-not-fired-immediately-after-script-execution'
  useInteractive = ('readyState' in doc.createElement("script")),
// loop all script nodes in doc, if one's readyState is 'interactive'
// means it's now executing;
  interactiveScript;


/**
 * Load a module use dynamic script insertion.
 * once confirm the module loaded and executed, then update
 * cache's info and exec module's factory function.
 * @param {String} url File path to fetch.
 * @param {String} name Original name to require this module.
 *   maybe a top-level name, relative name or absolute name.
 */
function fetch(url, name) {
  var script = doc.createElement("script");
  script.charset = "utf-8";
  script.async = true;
  // custom attribute to remember the original required name
  // which written in dependant module.
  script.kernel_name = name;

  // Event binding
  script.onreadystatechange = script.onload = script.onerror = function () {
    script.onreadystatschange = script.onload = script.onerror = null;
    interactiveScript = null;
    if (!script.readyState || /complete/.test(script.readyState)) {
      head.removeChild(script);
    }
  };

  // Older IEs will request the js file once src has been set,
  // then readyState will be "loaded" if script complete loading,
  // but change to "complete" after the code executed.
  script.src = url;
  currentAddingScript = script;
  if ($base) {
    head.insertBefore(script, $base);
  } else {
    head.appendChild(script);
  }
  currentAddingScript = null;
}


/**
 * get all script nodes in document at present
 * @return {NodeList}
 */
function scripts() {
  return doc.getElementsByTagName("script");
}


/**
 * get current executing script
 * @return {*}
 */
function getCurrentScript() {
  // In chrome and FF and Opera, use Error.prototype.stack
  // It's important to note that this will not reference the <script> element
  // if the code in the script is being called as a callback or event handler;
  // it will only reference the element while it's initially being processed.
  // Read more:
  //   'https://developer.mozilla.org/en-US/docs/Web/API/document.currentScript'
  return doc.currentScript || currentAddingScript || (function() {
    var _scripts;
    if (useInteractive) {
      if (interactiveScript &&
        interactiveScript.readyState === "interactive") {
        return interactiveScript;
      }

      _scripts = scripts();
      forEach(_scripts, function(script) {
        if (script.readyState === "interactive") {
          interactiveScript = script;
          return break_obj;
        }
      });
      return interactiveScript;
    }
    // todo in FF early version
    // return null;
  })() || (function() {
    var ret = null;
    var stack;
    try {
      throw new Error();
    } catch(e) {
      stack = e.stack;
    }

    if (!stack) {
      return ret;
    }

    /**
     * chrome uses at, FF uses @
     * Also consider IE 11.
     * FireFox: e.g.
     * getCurrentScript/<@file:///D:/Develop/SOI/lib/kernel.js:261:15
     * getCurrentScript@file:///D:/Develop/SOI/lib/kernel.js:257:1
     * getCurrentPath@file:///D:/Develop/SOI/lib/kernel.js:314:16
     * require@file:///D:/Develop/SOI/lib/kernel.js:563:29
     * require.async@file:///D:/Develop/SOI/lib/kernel.js:1178:5
     * bind/<@file:///D:/Develop/SOI/demo/assets/js/app.js:25:9
     * F@file:///D:/Develop/SOI/demo/lib/events/util.js:2:4216
     * q@file:///D:/Develop/SOI/demo/lib/events/util.js:2:1034
     * y/a<@file:///D:/Develop/SOI/demo/lib/events/util.js:2:2610
     *
     * chrome 39.0 e.g.
     * at file:///D:/lib/kernel.js:261:15
     * at getCurrentScript (file:///D:/lib/kernel.js:294:7)
     * at getCurrentPath (file:///D:/lib/kernel.js:314:16)
     * at require (file:///D:/lib/kernel.js:563:29)
     * at Function.require.async (file:///D:/lib/kernel.js:1178:5)
     * at HTMLButtonElement.<anonymous> (file:///D:/assets/js/app.js:25:17)
     * at F (file:///D:/lib/events/util.js:2:4218)
     * at q (file:///D:/lib/events/util.js:2:1034)
     * at HTMLButtonElement.<anonymous> (file:///D:/lib/events/util.js:2:2610)"
     *
     * IE11 e.g.
     * at Anonymous function (file:///D:/Develop/SOI/lib/kernel.js:294:7)
     * at getCurrentPath (file:///D:/Develop/SOI/lib/kernel.js:314:16)
     * at Global code (file:///D:/Develop/SOI/lib/kernel.js:563:29)
     */
    var e = stack.indexOf(" at ") !== -1 ? " at " : "@";
    var index = stack.indexOf(".async");
    if (index > -1) {
      stack = stack.substring(index + 7);
      stack = stack.split(e)[1];
      stack = stack.replace(/^([^\(]*\()/, '');
    } else {
      while (stack.indexOf(e) !== -1) {
        stack = stack.substring(stack.indexOf(e) + e.length);
      }
    }

    stack = stack.substring(0, stack.indexOf(".js") + 3);
    // for ie11
    stack = stack.replace(/^([^\(]*\()/, "");

    var _scripts = scripts();
    forEach(_scripts, function(script) {
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
 * Retrieve the absolute path of script node cross browser.
 * @param {HTMLScriptElement} script
 * @return {*}
 */
function getAbsPathOfScript(script) {
  return script.hasAttribute ? script.src : script.getAttribute("src", 4);
}


/**
 * Retrieve the current executing script node's
 * absolute path.
 * @return {String}
 */
function getCurrentPath() {
  var node = getCurrentScript();
  return node && getAbsPathOfScript(node);
}
