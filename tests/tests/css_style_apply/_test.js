go(["_reporter", "one", "two"], function (amdJS, one) {

  amdJS.assert('palevioletred' === one.color, 'css_module: one.color');
  amdJS.assert('60px' === one.lineHeight, 'css_module: one.lineHeight');
  amdJS.assert('24px' === one.fontSize, 'css_module: one.fontSize');

  amdJS.print('DONE', 'done');

});
