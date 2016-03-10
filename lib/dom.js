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
    var mod = new Module({
      uri: url
    });
    // update path2uid
    if (kernel.path2id[url]) {
      kernel.path2id[url].push(mod.id);
    } else {
      kernel.path2id[url] = [mod.id];
    }

    callback();
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
 * @return {?string}
 */
function getCurrentScriptPath() {
  var node = getCurrentScript();
  return node ? getAbsPathOfScript(node) : null;
}
