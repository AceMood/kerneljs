define('a', function(require, exports, module) {

  var cSub = require('c/sub');

  module.exports = {
    age: 100,
    cSub: cSub
  };
});
