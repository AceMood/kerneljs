define('app', function(require, exports, module) {

  var moduleA = require('./moduleA');
  var moduleB = require('./moduleB');

  require('./moduleC.css');

  alert(moduleA.name + '  ' + moduleB.name);

});