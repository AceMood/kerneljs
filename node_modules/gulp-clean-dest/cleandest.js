var fs = require('fs');
var path = require('path');
var through2 = require('through2');

function cleanDest(outFolder) {
  function cleanFile(file, encoding, callback) {
    var filePath = path.resolve(file.cwd, outFolder, file.relative);
    fs.unlink(filePath, function() { callback(null, file); });
  }
  var stream = through2.obj(cleanFile);
  stream.resume();
  return stream;
}

module.exports = cleanDest;
