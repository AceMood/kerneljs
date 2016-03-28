// _reporter.js
(function() {
  var factory = function(require, exports, module) {
    exports.print = function () {
      // global print
      print.apply(undefined, arguments);
    };

    exports.assert = function (guard, message) {
      if (guard) {
        exports.print("PASS " + message, "pass");
      } else {
        exports.print("FAIL " + message, "fail");
      }
    };
  };

  // define this module
  define("_reporter", factory);

})();