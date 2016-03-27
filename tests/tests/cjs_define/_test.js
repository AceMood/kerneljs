go(function(require) {

  var amdJS = require('_reporter');
  var one = require('one');
  var two = require('two');
  var three = require('three');


  var args = two.doSomething(),
    oneMod = two.getOneModule();

  amdJS.assert('large' === one.size, 'cjs_define: one.size');
  amdJS.assert('small' === two.size, 'cjs_define: two.size');
  amdJS.assert('small' === args.size, 'cjs_define: args.size');
  amdJS.assert('redtwo' === args.color, 'cjs_define: args.color');
  amdJS.assert('one' === oneMod.id, 'cjs_define: module.id property support');
  amdJS.assert('three' === three.name, 'cjs_define: three.name');
  amdJS.assert('four' === three.fourName, 'cjs_define: four.name via three');
  amdJS.assert('five' === three.fiveName, 'cjs_define: five.name via four');
  amdJS.print('DONE', 'done');
});
