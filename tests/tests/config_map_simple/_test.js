kerneljs.config({
  resourceMap: {
    'a': {
      id: 'a',
      uri: '/kerneljs/config_map_simple/a1.js',
      deps: ['c', 'c/sub'],
      type: 'JS'
    },
    'c': {
      id: 'c',
      uri: '/kerneljs/config_map_simple/c.js',
      deps: [],
      type: 'JS'
    },
    'c/sub': {
      id: 'c/sub',
      uri: '/kerneljs/config_map_simple/c/sub.js',
      deps: [],
      type: 'JS'
    }
  }
});

go(function(require) {

  var amdJS = require('_reporter');
  var a = require('a');
  var b = require('b');

  amdJS.assert('c' === a.c.name, 'config_map_simple: a.c.name');
  amdJS.assert('c/sub' === a.cSub.name, 'config_map_simple: a.cSub.name');
  amdJS.assert('c' === b.c.name, 'config_map_simple: b.c.name');
  amdJS.assert('c/sub', b.cSub.name, 'config_map_simple: b.cSub.name');
  amdJS.print('DONE', 'done');
});
