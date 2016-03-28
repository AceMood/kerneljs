// _reporter.js
(function() {

  // define this module
  define("_reporter", function(require, exports) {
    exports.print = function() {
      // global print
      print.apply(undefined, arguments);
    };

    exports.assert = function(guard, message) {
      if (guard) {
        exports.print("PASS " + message, "pass");
      } else {
        exports.print("FAIL " + message, "fail");
      }
    };
  });

})();