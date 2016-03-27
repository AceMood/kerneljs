go(function(require, exports, module) {

  var amdJS = require('_reporter');
  var a = require('a');
  var b = require('b');

  amdJS.assert("a" === a.name, "anon_simple: a.name");
  amdJS.assert("b" === b.name, "anon_simple: b.name");
  amdJS.assert("c" === b.cName, "anon_simple: c.name via b");
  amdJS.print("DONE", "done");
});
