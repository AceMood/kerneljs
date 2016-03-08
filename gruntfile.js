/**
 * @file 构建文件
 * @author AceMood
 * @email zmike86@gmail.com
 */

module.exports = function(grunt) {

  grunt.initConfig({
    clean: ['dist/*'],
    jshint: {
      files: [
        'src/utils.js',
        'src/dom.js',
        'src/path.js',
        'src/Module.js',
        'src/core.js',
        'src/kernel.js',
        'src/event.js',
        'src/log.js'
      ],
      options: {
        curly: true,
        eqeqeq: true,
        es3: true,
        maxlen: 120,
        nonew: true,
        freeze: true,
        globals: {
          document: true
        }
      }
    },
    concat: {
      options: {
        separator: '',
        stripBanners: false,
        nonull: true
      },
      dev: {
        src: [
          'src/intro.js',
          'src/utils.js',
          'src/dom.js',
          'src/path.js',
          'src/Module.js',
          'src/core.js',
          'src/kernel.js',
          'src/event.js',
          'src/log.js',
          'src/outro.js'
        ],
        dest: 'dist/kernel.debug.js'
      },
      pro: {
        src: [
          'src/intro.js',
          'src/utils.js',
          'src/dom.js',
          'src/path.js',
          'src/Module.js',
          'src/core.js',
          'src/kernel.js',
          'src/event.js',
          'src/outro.js'
        ],
        dest: 'dist/kernel.src.js'
      }
    },
    uglify: {
      options: {
        report: 'gzip',
        sourceMap: true,
        banner: '/** kernel.js by AceMood@Saber-Team */',
        compress: {
          "sequences"     : true,  // join consecutive statemets with the “comma operator”
          "properties"    : true,  // optimize property access: a["foo"] → a.foo
          "dead_code"     : true,  // discard unreachable code
          "drop_debugger" : true,  // discard “debugger” statements
          "unsafe"        : false, // some unsafe optimizations (see below)
          "conditionals"  : true,  // optimize if-s and conditional expressions
          "comparisons"   : true,  // optimize comparisons
          "evaluate"      : true,  // evaluate constant expressions
          "booleans"      : true,  // optimize boolean expressions
          "loops"         : true,  // optimize loops
          "unused"        : true,  // drop unused variables/functions
          "hoist_funs"    : true,  // hoist function declarations
          "hoist_vars"    : false, // hoist variable declarations
          "if_return"     : true,  // optimize if-s followed by return/continue
          "join_vars"     : true,  // join var declarations
          "cascade"       : true,  // try to cascade `right` into `left` in sequences
          "side_effects"  : true,  // drop side-effect-free statements
          "warnings"      : true,  // warn about potentially dangerous optimizations/code
          "global_defs"   : {      // global definitions
            "DEBUG"       : false
          }
        }
      },
      pro: {
        files: {
          'dist/kernel.min.js': ['dist/kernel.src.js']
        },
        options: {
          sourceMapName: 'dist/kernel.min.map'
        }
      }
    },
    copy: {
      dev: {
        src: 'dist/kernel.debug.js',
        dest: 'tests/impl/kerneljs/',
        filter: 'isFile',
        flatten: true,
        nonull: true,
        expand: true
      },
      pro: {
        src: 'dist/kernel.src.js',
        dest: 'tests/impl/kerneljs/',
        filter: 'isFile',
        flatten: true,
        nonull: true,
        expand: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // default task
  grunt.registerTask('default', [
    'clean',
    'jshint',
    'concat',
    'uglify',
    'copy'
  ]);

};