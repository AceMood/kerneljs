define('c', ['require'], function (require) {
  //alert(require.toUrl('./c/templates/first.txt'));
  return {
    name: 'c',
    url: require.toUrl('./c/templates/first.txt')
  };
});
