
on('create', function(mod) {
  console.log('Create on:    ' + mod.url);
});

on('start:fetch', function(mod) {
  console.log('Fetch for:    ' + mod.url);
});

on('complete', function(mod) {
  console.log('Complete on:  ' + mod.url);
});
