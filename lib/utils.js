
var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;

// use such an object to determine cut down a forEach loop;
var break_obj = {};

/** 空函数作为默认回调函数 */
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
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 */
function forEach(arr, fn, opt_context) {
  if (native_forEach && arr.forEach === native_forEach) {
    arr.forEach(fn, opt_context);
  } else if (arr.length === +arr.length) {
    for (var i = 0, length = arr.length; i < length; i++) {
      if (fn.call(opt_context, arr[i], i, arr) === break_obj) {
        break;
      }
    }
  }
}

/**
 * 正向寻找指定项在数组的位置;
 * @param {Array} arr
 * @param {*} tar
 * @return {Number}
 */
function indexOf(arr, tar) {
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === tar) {
      return i;
    }
  }
  return -1;
}

/**
 * 类型映射
 * @type {Object}
 */
var typeMap = {
  '[object Object]'   : 'object',
  '[object Array]'    : 'array',
  '[object Function]' : 'function',
  '[object RegExp]'   : 'regexp',
  '[object String]'   : 'string',
  '[object Number]'   : 'number'
};

/**
 * 判断对象类型, 见typeMap
 */
function typeOf(obj) {
  return typeMap[toString.call(obj)];
}

/**
 * 判断是否为undefined或者null
 * @param {*} obj
 * @return {boolean}
 */
function isNull(obj) {
  return obj === void 0 || obj === null;
}
