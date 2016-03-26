__d('main', function(require) {
  var moduleA = require('a');
  var moduleB = require('b');

  alert(moduleA.name + ' ' + moduleB.name);

  document.querySelector('button').addEventListener('click', function(e) {
    require.async(['dialog'], function(dialog) {
      alert(dialog.name);
    });
  }, false);

});