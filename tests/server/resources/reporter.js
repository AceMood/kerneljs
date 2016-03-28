/*
 * This file bridges the standard AMD-JS test suite with the simple
 * browser runner. We proxy the go() method, and then we implement
 * the window.print method as per the specification.
 *
 * The proxy of go() allows us to manage a timeout for the test
 * in case there is a deep problem with the loader itself
 * (read: even require() is broken)
 *
 * The print method pushes data to the top-level window.console
 * as well as registering its suite result with the parent
 */
(function(scope) {
  // load me after your AMD implementation that provides
  // "go", "config", and "implemented"
  window.setTimeout(function() {
    // console.log("make body gray");
    // document.body.style.backgroundColor = 'gray';
  }, 0);

  var oldGo = window.go;
  var stopStack = [];
  var pass = true;

  // resolve the tests to a background color
  var resolve = function() {
    var color = 'gray';
    // empty stack or failing tests resolve immediately
    if (stopStack.length === 0 || !pass) {
      color = (pass) ? 'green' : 'red';
    }
    //alert(color);
    document.body.style.backgroundColor = color;
  };

  // override go() with a start/stop timer
  window.go = function() {
    var newArgs = [];
    for (var i = 0; i < arguments.length; ++i) {
      newArgs.push(arguments[i]);
    }
    var fn = newArgs[newArgs.length - 1];

    stopStack.push(window.setTimeout(function() {
      window.print('Test timed out: ' + newArgs.join(';'), 'fail');
    }, 3000));

    oldGo.apply(oldGo, newArgs);
  };

  // print causes a console log event
  // on first fail, we flag as red
  window.print = function(message, type) {
    var fullMessage = type + '    ' + message;
    window.top.console && window.top.console.log(fullMessage);

    try {
      if (window.top.amdJSSignal) {
        if (type === 'fail') {
          window.top.amdJSSignal.fail(message);
        }
        else if (type === 'done') {
          window.top.amdJSSignal.done();
        }
      }
    } catch (e) {}

    if (type === 'fail') {
      pass = false;
      resolve();
    }

    if (type === 'done') {
      window.clearTimeout(stopStack.pop());
      resolve();
    }
  };
})(this);