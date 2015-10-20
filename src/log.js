/**
 * @fileoverview 源码调试用
 */

kerneljs.on('create', function(mod) {
  console.log('Create on:    ' + mod.url);
});

kerneljs.on('start:fetch', function(mod) {
  console.log('Fetch for:    ' + mod.url);
});

kerneljs.on('complete', function(mod) {
  console.log('Complete on:  ' + mod.url);
});
