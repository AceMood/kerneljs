define(function(require, exports, module) {
  //Dependencies
  var one = require('./one');
  module.exports = {
    size: "small",
    color: "redtwo",
    doSomething: function() {
      return {
        size: 'small',
        color: 'red'
      }
    },
    getOneModule: function() {
      return one;
    }
  };
});
