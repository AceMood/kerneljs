define('car', function(require, exports, module) {
  module.exports = {
    name: 'car',
    wheels: require('wheels'),
    engine: require('engine')
  };
});
