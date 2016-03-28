define(function(require, exports, module) {
  exports.size = "large";
  exports.module = module;
  exports.doSomething = function() {
    return {
      size: "small",
      color: "redtwo"
    }
  };
});
