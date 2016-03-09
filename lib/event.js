/**
 * @file take care of kerneljs event publish and subscribe
 * @email zmike86@gmail.com
 * @preserved
 */

// handles cache map
var handlersMap = {};

// event names
var events = {
  create: 'create',
  fetch: 'fetch',
  loaded: 'loaded',
  complete: 'complete',
  error: 'error'
};

/**
 * subscribe
 * @param {string} eventName
 * @param {function} handler
 * @param {*} context handler's context
 */
function on(eventName, handler, context) {
  if (!handlersMap[eventName]) {
    handlersMap[eventName] = [];
  }
  handlersMap[eventName].push({
    handler: handler,
    context: context
  });
}

/**
 * trigger event
 * @param {string} eventName
 * @param {Array.<object>} args callback parameters
 */
function emit(eventName, args) {
  // 缓存防止事件处理器改变kerneljs.cache对象
  var arr = handlersMap[eventName];
  if (arr) {
    forEach(arr, function(obj) {
      obj.handler.apply(obj.context, args);
    });
  }
}
