
//main api object
var CSS = {};
CSS.engineRe = /Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/;
CSS.engine = window.navigator.userAgent.match(CSS.engineRe) || 0;

// 用style元素中的@import加载css模块
// IE < 9, Firefox < 18
CSS.useImportLoad = false;

// 采用onload事件在webkit下会有问题，此时设成false
CSS.useOnload = true;

// trident / msie
if (CSS.engine[1] || CSS.engine[7]) {
  CSS.useImportLoad = parseInt(CSS.engine[1]) < 6 || parseInt(CSS.engine[7]) <= 9;
  // webkit
} else if (CSS.engine[2] || CSS.engine[8]) {
  CSS.useOnload = false;
  // gecko
} else if (engine[4]) {
  CSS.useImportLoad = parseInt(engine[4]) < 18;
}

/**
 * 创建style元素
 */
function createStyle() {
  CSS.curStyle = document.createElement('style');
  head.appendChild(CSS.curStyle);
  CSS.curSheet = CSS.curStyle.styleSheet || CSS.curStyle.sheet;
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
  if (CSS.useOnload) {
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


CSS.normalize = function(name, normalize) {
  if (name.substr(name.length - 4, 4) == '.css')
    name = name.substr(0, name.length - 4);

  return normalize(name);
};


CSS.load = function(cssId, req, load, config) {
  var method = (CSS.useImportLoad ? importLoad : linkLoad);
  method(req.toUrl(cssId + '.css'), load);
};
