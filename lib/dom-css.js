/**
 * @file DOM CSS relative ops
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
