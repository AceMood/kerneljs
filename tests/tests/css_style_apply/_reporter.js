// _reporter.js
(function() {

    // define this module
    define("_reporter", [], function () {
        var exports = {};

        exports.print = function () {
            // global print
            if (typeof amdJSPrint !== "undefined") {
                amdJSPrint.apply(undefined, arguments);
            }
            else {
                var stdout = require("system").stdout;
                stdout.print.apply(stdout, arguments);
            }
        };

        exports.assert = function (guard, message) {
            if (guard) {
                exports.print("PASS " + message, "pass");
            } else {
                exports.print("FAIL " + message, "fail");
            }
        };

        return exports;
    });

})();