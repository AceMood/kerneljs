define('a', function(require, exports, module) {

  var c = require('c');
  var cSub = require('c/sub');

  module.exports = {
    age: 100,
    c: c,
    cSub: cSub
  };
});
