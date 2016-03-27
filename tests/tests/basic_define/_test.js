go(function(require) {

  var amdJS = require('_reporter');

  amdJS.assert(typeof define === 'function', 'basic_define: define is a function');
  amdJS.print('DONE', 'done');
  
});