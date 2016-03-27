define('b', function(require, exports, module) {

  var c = require('sub/c');

  module.exports = {
    name: 'b',
    cName: c.name
  };
});
