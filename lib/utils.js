/**
 * @file utility functions
 * @email zmike86@gmail.com
 */

var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;

// use such an object to determine cut down a forEach loop;
var break_obj = {};

// no operation function as callback
function noop() {}

/**
 * NOTE:
 * The forEach function is intentionally generic;
 * it does not require that its this value be an Array object.
 * Therefore it can be transferred to other kinds of objects
 * for use as a method. Whether the forEach function can be applied
 * successfully to a host object is implementation-dependent.
 *
 * @param {Array|NodeList} arr array to be iterated.
 * @param {function} fn callback to execute on each item
 * @param {object?} opt_context fn's context
 */
function forEach(arr, fn, opt_context) {
  if (native_forEach && arr.forEach === native_forEach) {
    arr.forEach(fn, opt_context)
  } else if (arr.length === +arr.length) {
    for (var i = 0, length = arr.length; i < length; i++) {
      if (fn.call(opt_context, arr[i], i, arr) === break_obj) {
        break
      }
    }
  }
}

/**
 * Search for specific item in an array.
 * @param {Array} arr search array
 * @param {*} tar target object
 * @return {number} position index based from Zero
 */
function indexOf(arr, tar) {
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === tar) {
      return i
    }
  }
  return -1
}

/**
 * @type {object}
 */
var typeMap = {
  '[object Object]'   : 'object',
  '[object Array]'    : 'array',
  '[object Function]' : 'function',
  '[object String]'   : 'string',
  '[object Number]'   : 'number'
};

/**
 * Object Type, see typeMap
 */
function typeOf(obj) {
  return typeMap[toString.call(obj)]
}
