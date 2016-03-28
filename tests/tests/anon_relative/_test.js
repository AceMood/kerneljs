go(function(require, exports, module) {

  var amdJS = require('_reporter');
  var array = require('impl/array');

  amdJS.assert('impl/array' === array.name, 'anon_relative: array.name');
  amdJS.assert('impl/util' === array.dotUtilName, 'anon_relative: resolved "./util" to impl/util');
  amdJS.assert('util' === array.utilName, 'anon_relative: resolved "util" to impl/util');
  amdJS.print('DONE', 'done');
});
