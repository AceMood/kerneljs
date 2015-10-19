
// 解析ua
var engineRe = /Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/,
    engine = window.navigator.userAgent.match(engineRe) || 0,
    curStyle, curSheet;

// 用style元素中的@import加载css模块
// IE < 9, Firefox < 18
var useImportLoad = false,
// 采用onload事件在webkit下会有问题，此时设成false
    useOnload = true;

// trident / msie
if (engine[1] || engine[7]) {
  useImportLoad = parseInt(engine[1]) < 6 || parseInt(engine[7]) <= 9;
  // webkit
} else if (engine[2] || engine[8]) {
  useOnload = false;
  // gecko
} else if (engine[4]) {
  useImportLoad = parseInt(engine[4]) < 18;
}

/**
 * 创建style元素
 */
function createStyle() {
  curStyle = document.createElement('style');
  head.appendChild(curStyle);
  curSheet = curStyle.styleSheet || curStyle.sheet;
}

var ieCnt = 0;
var ieLoads = [];
var ieCurCallback;

var createIeLoad = function(url) {
  curSheet.addImport(url);
  curStyle.onload = function() {
    processIeLoad()
  };

  ieCnt++;
  if (ieCnt == 31) {
    createStyle();
    ieCnt = 0;
  }
};

var processIeLoad = function() {
  ieCurCallback();

  var nextLoad = ieLoads.shift();

  if (!nextLoad) {
    ieCurCallback = null;
    return;
  }

  ieCurCallback = nextLoad[1];
  createIeLoad(nextLoad[0]);
};

var importLoad = function(url, callback) {
  if (!curSheet || !curSheet.addImport)
    createStyle();

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
        curStyle.sheet.cssRules;
        clearInterval(loadInterval);
        callback();
      } catch(e) {}
    }, 10);
  }
};

/**
 * 创建link元素监听onload事件
 * @param {String} url css地址
 * @param {Function} callback 回调函数
 */
var linkLoad = function(url, callback) {
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
  head.appendChild(link);
};



var doc = document,
    head = doc.head || doc.getElementsByTagName('head')[0],
    // IE6下的经典bug, 有base元素的情况下head.appendChild容易出错in jQuery.
    // 详见: 'http://dev.jquery.com/ticket/2709'
    $base = doc.getElementsByTagName('base')[0];

if ($base) {
  head = $base.parentNode;
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
    useInteractive = ('readyState' in doc.createElement('script')),
    // loop all script nodes in doc, if one's readyState is 'interactive'
    // means it's now executing;
    interactiveScript;

/**
 * @param {String} url 当前需要资源的网络路径
 * @param {String} name Original name to require this module.
 *   maybe a top-level name, relative name or absolute name.
 */
function fetchCss(url, name) {
  var method = (useImportLoad ? importLoad : linkLoad);
  method(url, CSS.load);
}

/**
 * @param {String} url 文件路径
 * @param {String} name Original name to require this module.
 *   maybe a top-level name, relative name or absolute name.
 */
function fetchScript(url, name) {
  var script = doc.createElement('script');
  script.charset = 'utf-8';
  script.async = true;
  // custom attribute to remember the original required name
  // which written in dependant module.
  script.kernel_name = name;

  // Event binding
  script.onreadystatechange = script.onload = script.onerror = function() {
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
 * 动态获取模块
 * @param {String} url 文件路径
 * @param {String} name Original name to require this module.
 *   maybe a top-level name, relative name or absolute name.
 */
function fetch(url, name) {
  if (url.indexOf('.css') === url.length - 4) {
    fetchCss(url, name);
  } else {
    fetchScript(url, name);
  }
}

/**
 * 获取当前页面中所有script节点
 * @return {NodeList}
 */
function scripts() {
  return doc.getElementsByTagName('script');
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
  return doc.currentScript || currentAddingScript || (function() {
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
function getCurrentPath() {
  var node = getCurrentScript();
  return node ? getAbsPathOfScript(node) : null;
}
