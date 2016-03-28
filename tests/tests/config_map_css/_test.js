kerneljs.config({
  resourceMap: {
    'a': {
      id: 'a',
      uri: '/kerneljs/config_map_css/a1.js',
      deps: ['c', 'c/sub'],
      type: 'JS'
    },
    'b': {
      id: 'b',
      uri: '/kerneljs/config_map_css/c/b.css',
      type: 'CSS'
    },
    'c': {
      id: 'c',
      uri: '/kerneljs/config_map_css/c.css',
      deps: ['b'],
      type: 'CSS'
    },
    'c/sub': {
      id: 'c/sub',
      uri: '/kerneljs/config_map_css/c/sub.js',
      type: 'JS'
    }
  }
});

go(function(require) {

  var amdJS = require('_reporter');
  var a = require('a');

  amdJS.assert(100 === a.age, 'config_map_css: a.age');
  amdJS.assert('c/sub' === a.cSub.name, 'config_map_css: a.cSub.name');
  amdJS.print('DONE', 'done');
});
