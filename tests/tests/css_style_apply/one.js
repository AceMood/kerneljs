define(function(require, exports, module) {

    var css = require('./one.css');

    var getStyle = function(dom, prop) {
        var style = window.getComputedStyle ? window.getComputedStyle(dom) : dom.currentStyle;
        return style[prop];
    };

    var $text = document.getElementById('text');
    var color = getStyle($text, 'color'),
        lineHeight = getStyle($text, 'lineHeight'),
        fontSize = getStyle($text, 'fontSize');

    debugger;

    exports.color = color;
    exports.lineHeight = lineHeight;
    exports.fontSize = fontSize;
});
