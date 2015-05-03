
/**
 * @fileoverview 源码调试用
 */

(function(){

  'use strict';

  var log = console.log ? console.log : noop;
  var format = typeof JSON === 'object' ? JSON.stringify : noop;

  kerneljs.on('create', function(mod) {
    log('Create on:    ' + format(mod));
  });

  kerneljs.on('start:fetch', function(mod) {
    log('Fetch for:    ' + format(mod));
  });

  kerneljs.on('complete', function(mod) {
    log('Complete on:  ' + format(mod));
  });

})();
