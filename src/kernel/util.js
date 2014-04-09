
var OP = Object.prototype,
    AP = Array.prototype,
    native_forEach = AP.forEach,
    native_map = AP.map,
    hasOwn = OP.hasOwnProperty,
    toString = OP.toString;

/**
 * if a module with in the same id exists, then define with the id
 * will fail. we throw an error with useful message.
 */
function exist_id_error(id) {
    throw "more then one module defined with the same id: " + id;
}

/**
 * iterate the array and map the value to a delegation
 * function, use the return value replace original item.
 * @param {Array} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 * @return {!Array}
 */
function map(arr, fn, opt_context) {
    var ret = [];
    if (native_map && arr.map === native_map) {
        ret = arr.map(fn, opt_context)
    } else if (arr.length === +arr.length) {
        for (var i = 0; i < arr.length; ++i) {
            ret.push(fn.call(opt_context || null, arr[i], i, arr))
        }
    }
    return ret;
}


/**
 * enhancement for Array.prototype.forEach.
 * @param {Array} arr array to be iterated.
 * @param {Function} fn callback to execute on each item
 * @param {Object?} opt_context fn's context
 */
function forEach(arr, fn, opt_context) {
    if (native_forEach && arr.forEach === native_forEach) {
        arr.forEach(fn, opt_context)
    } else if (arr.length === +arr.length) {
        for (var i = 0, length = arr.length; i < length; i++) {
            fn.call(opt_context, arr[i], i, arr)
        }
    }
}

var type_map = {
    "[object Object]": "object",
    "[object Array]" : "array",
    "[object Function]": "function",
    "[object RegExp]": "regexp",
    "[object Null]"  : "null",
    "[object Undefined]" : "undefined"
    "[object String]": "string",
    "[object Number]": "number"
}

/**
 * detect the obj's type
 */
function typeOf(obj) {
    return type_map[toString.call(obj)]
}
