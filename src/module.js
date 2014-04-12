
var doc = document,
    head = doc.head || doc.getElementByTagName("head")[0];


function noop() {}


/**
 * @constructor
 */
function Module(obj) {
    this.uid = obj.uid;
    this.id = obj.id || null;
    this.url = obj.url;
    this.deps = obj.deps || resolveRequireInternal();
    this.status = obj.status || Module.STATUS.uninit;
    this.factory = obj.factory || noop;
    this.exports = null;
}


//  
// 
//
Module.STATUS = {
    "uninit"    : 0,
    "fetching"  : 1,
    "loaded"    : 2,
    "complete"  : 3
};

