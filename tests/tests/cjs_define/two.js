define(function(require, exports, module) {
//Dependencies
  var one = require('one');
  module.exports = {
    size: "small",
    color: "redtwo",
    doSomething: function() {
      return one.doSomething();
    },
    getOneModule: function() {
      return one.module;
    }
  };
});
