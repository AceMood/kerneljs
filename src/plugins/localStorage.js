// todo 可能需要大改define的实现
// todo 需要判断localStorage的剩余空间，动态清除无用项

(function() {
  var supportLocalStorage = ('localStorage' in window);
  var oldRequest = kerneljs.request;

  fetchScript = kerneljs.request = function(url, name, callback) {
    if (kerneljs.data.useLocalCache &&
        supportLocalStorage) {
      if (localStorage[url]) {
        var code = localStorage[url];
        eval.call(null, code);
        callback();
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 ||
                ((xhr.status === 0) && xhr.responseText) ) {
              var code = xhr.responseText;

              localStorage[url] = code;

              var script = $doc.createElement('script');
              script.charset = 'utf-8';
              script.defer = true;
              // Have to use .text, since we support IE8,
              // which won't allow appending to a script
              script.text = code;
              currentAddingScript = script;
              if ($base) {
                $head.insertBefore(script, $base);
              } else {
                $head.appendChild(script);
              }
              currentAddingScript = null;
            } else {
              // new Error(xhr.statusText);
            }
          }
        };

        // By default XHRs never timeout, and even Chrome doesn't implement the
        // spec for xhr.timeout. So we do it ourselves.
        setTimeout(function() {
          if (xhr.readyState < 4) {
            xhr.abort();
          }
        }, 5000);

        xhr.send();
      }
    } else {
      oldRequest(url, name, callback);
    }
  };

})();