define(function(require, exports, module) {

  require('./moduleA.css');

  var mod = require('./dir/mod');

  module.exports = {
    name: 'a'
  };

});