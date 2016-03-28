go(function(require, exports) {

  var amdJS = require('_reporter');
  var one = require('one');

  amdJS.assert('rgb(219, 112, 147)' === one.color, 'css_style_apply: one.color');
  amdJS.assert('60px' === one.lineHeight, 'css_style_apply: one.lineHeight');
  amdJS.assert('24px' === one.fontSize, 'css_style_apply: one.fontSize');

  amdJS.print('DONE', 'done');

});
