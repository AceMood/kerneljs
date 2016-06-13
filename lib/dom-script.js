/**
 * @file DOM JS API relative options
 * @author AceMood
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
 * add callback functions to a specific url when resource loaded
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
 * fetch script or css
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
 * get all script elements in current document.head
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
  // todo remove document.currentScript, it's not always available.
  // 除了异步的情况, w3c对其值有明确说明, 有时未必是我们想要的特别在
  // CommonJS wrapper的情况下
  return currentAddingScript || document.currentScript ||
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
 * Get script abs src cross browsers.
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
