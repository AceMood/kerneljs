define('c', function (require, exports, module) {
  //alert(require.toUrl('./c/templates/first.txt'));
  module.exports = {
    name: 'c',
    url: require.toUrl('./c/templates/first.txt')
  };
});
