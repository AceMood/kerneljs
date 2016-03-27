
define(function(require, exports, module) {
  var dotUtil = require('./util');
  var util = require('util');

  module.exports = {
    name: 'impl/array',
    dotUtilName: dotUtil.name,
    utilName: util.name
  };
});
