module.exports = function(grunt) {

  grunt.initConfig({
    clean: ['dist/*.js'],
    jshint: {
      files: ['src/*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    concat: {
      options: {
        separator: ';',
        stripBanners: false,
        nonull: true,
        process: function(src, filepath) {
          debugger;
        }
      },
      dist: {
        src: [
          'src/intro.js',
          'src/utils.js',
          'src/path.js',
          'src/module.js',
          'src/define.js',
          'src/require.js',
          'src/kernel.js',
          'src/outro.js'
        ],
        dest: 'dist/kernel.js'
      }
    },
    minify: {
      options: {
        report: 'gzip',
        sourceMap: true,
        banner: 'kernel.js by AceMood',
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
      build: {
        files: {
          'dist/kernel.min.js': ['dist/kernel.js']
        }
      }
    },
    copy: {
      main: {
        files: [
          // includes files within path
          {
            expand: true,
            src: ['dist/kernel.js'],
            dest: 'tests/impl/kerneljs/',
            filter: 'isFile'
          }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', [
    'clean',
    'jshint',
    'concat',
    'minify',
    'copy'
  ]);

};