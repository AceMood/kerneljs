kerneljs.config({
  resourceMap: {
    JS: {
      'a': {
        id: 'a',
        uri: '/kerneljs/config_map_css/a1.js',
        deps: ['c/sub'],
        css: ['c']
      },
      'c/sub': {
        id: 'c/sub',
        uri: '/kerneljs/config_map_css/c/sub.js'
      }
    },
    CSS: {
      'b': {
        id: 'b',
        uri: '/kerneljs/config_map_css/c/b.css'
      },
      'c': {
        id: 'c',
        uri: '/kerneljs/config_map_css/c.css',
        css: ['b']
      }
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
