
/**
 * kerneljs内部分发的事件名称
 * @typedef {Object}
 */
kerneljs.events = {
  create: 'create',
  startFetch: 'start:fetch',
  endFetch: 'end:fetch',
  complete: 'complete',
  error: 'error'
};


/**
 * 订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Function} handler 事件处理器
 * @param {*} context 事件处理器上下文
 */
kerneljs.on = function(eventName, handler, context) {
  if (!this.cache.events[eventName]) {
    this.cache.events[eventName] = [];
  }
  this.cache.events[eventName].push({
    handler: handler,
    context: context
  });
};


/**
 * 触发订阅事件
 * @param {String} eventName 事件名称定义在event.js
 * @param {Array.<Object>} args 参数
 */
kerneljs.trigger = function(eventName, args) {
  // 缓存防止事件处理器改变kerneljs.cache对象
  var arr = this.cache.events[eventName];
  if (arr) {
    forEach(arr, function(obj) {
      obj.handler.apply(obj.context, args);
    });
  }
};
