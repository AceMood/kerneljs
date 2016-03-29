/**
 * @file Anonymous Module Class represents require.async calls
 * @email zmike86@gmail.com
 */

/**
 * @class
 * @param {object} obj Configuration object. Include:
 *                     --uri: absolute path of module
 *                     --deps: dependency array, which stores moduleId or relative module path.
 *                     --factory: callback function
 *                     --status: Module.Status
 */
function AnonymousModule(obj) {
  this.uid = uidprefix + uuid++;
  this.id = obj.id || this.uid;
  this.uri = obj.uri;
  this.deps = obj.deps || [];
  this.depsCount = this.deps.length;
  this.status = Module.Status.init;
  this.factory = obj.factory || null;

  this.setStatus(Module.Status.init);
}

/**
 * Set module's status
 * @param {number} status
 */
AnonymousModule.prototype.setStatus = Module.prototype.setStatus;

/**
 * Inform current module that one of its dependencies has been loaded.
 * @return {boolean}
 */
AnonymousModule.prototype.checkAll = Module.prototype.checkAll;

/**
 * compile module
 */
AnonymousModule.prototype.compile = function() {
  if (this.status === Module.Status.complete) {
    return;
  }

  var mod = this;
  var args = [];

  forEach(mod.deps, function(name) {
    var dependencyModule = resolve(name, mod.uri);
    if (dependencyModule &&
      (dependencyModule.status >= Module.Status.loaded)) {
      args.push(dependencyModule.compile());
    }
  });

  this.factory.apply(null, args);
  delete this.factory;
  this.setStatus(Module.Status.complete);
};
