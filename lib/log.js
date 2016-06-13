/**
 * @file logs utilities
 * @email zmike86@gmail.com
 * @preserved
 */

on('create', function(mod) {
 console.log('Create on:    ' + mod.uri)
});

on('fetch', function(mod) {
 console.log('Fetch for:    ' + mod.uri)
});

on('ready', function(mod) {
  console.log('Ready:    ' + mod.uri)
});

on('complete', function(mod) {
  console.log('Complete on:  ' + mod.uri)
});
