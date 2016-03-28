go(function(require, exports, module) {

  var amdJS = require('_reporter');

  require.async(['./two'], function(two) {
    amdJS.assert('small' === two.doSomething().size, 'load js: two.size');
    amdJS.assert('red' === two.doSomething().color, 'load js: two.color');
    amdJS.print('DONE', 'done');
  });

});
