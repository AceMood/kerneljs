go(function(require) {

  var amdJS = require('_reporter');

  // tests if there are empty dependencies, no arguments are
  // available in the factory's method
  define('emptyDeps', function() {
    amdJS.assert(arguments.length === 0,
        'basic_empty_deps: [] should be treated as no dependencies instead of the ' +
        'default require, exports, module');
  });

  window.setTimeout(function() {
    require.async(['emptyDeps'], function () {
      debugger;
      amdJS.print('DONE', 'done');
    });
  }, 0);
});
