/**
 * @file 构建文件
 * @author AceMood
 * @email zmike86@gmail.com
 */

var gulp = require('gulp');
var clean = require('gulp-clean-dest');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var files = [
  'lib/utils.js',
  'lib/dom-script.js',
  'lib/dom-css.js',
  'lib/path.js',
  'lib/Module.js',
  'lib/core.js',
  'lib/event.js',
  'lib/kernel.js'
];

gulp.task('dev', function() {
  return gulp.src(['lib/intro.js'].concat(files).concat(['lib/log.js', 'lib/outro.js']))
    .pipe(clean('dist'))
    .pipe(jshint())
    .pipe(concat('kernel.debug.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', function() {
  return gulp.src(['lib/intro.js'].concat(files).concat(['lib/outro.js']))
    .pipe(clean('dist'))
    .pipe(jshint())
    .pipe(concat('kernel.min.js'))
    .pipe(uglify({
      mangle: true,
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
    }))
    .pipe(gulp.dest('dist'));
});