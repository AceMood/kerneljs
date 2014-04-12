
// and a directory file path could be ends with a slash (back slash in window)
var dirRegExp = /\/$/g,
// whether a path to a file with extension
    jsExtRegExp = /\.js$/g;


var loc = global.location;


/**
 * Normalize a string path, taking care of '..' and '.' parts.
 *
 * When multiple slashes are found, they're replaced by a single one;
 * when the path contains a trailing slash, it is preserved.
 * On Windows backslashes are used in FileSystem.
 *
 * Example:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} p
 */
function normalize(p) {
    // step1: combine multi slashes
    p = p.replace(/(\/)+/g, '/');

    // step2: resolve `.` and `..`
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // `http://blog.stevenlevithan.com/archives/cross-browser-split`.
    p = p.split('/');
    for (var i = 0; i < p.length; ++i) {
        if (p[i] === '.') {
            p.splice(i, 1);
            --i;
        } else if (p[i] === '..' && i > 0 && p[i - 1] != '..') {
            p.splice(i - 1, 2);
            i -= 2;
        }
    }
    return p.join('/');
}


/**
 * to get current document's directory
 * @return {string}
 */
function getPageDir() {
    return dirname(loc.href)
}


/**
 * Judge if a path is top-level
 * @param {string} p
 * @return {boolean}
 */
function isTopLevel(p) {
    return isRelative(p) && p[0] != '.';
}


/**
 * Judge if a path is a relative one.
 * In most environment, start with a single/double dot.
 *
 * e.g: ../a/b/c; ./a/b
 *
 * @param {string} p
 * @return {boolean}
 */
function isRelative(p) {
    return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p[0] != '/')
}


/**
 * Map the identifier for a module to a Internet file
 * path. xhrio can use the path to load module from
 * server.
 *
 * @param {!string} id Always the module's identifier.
 * @param {string?} base A relative baseuri for resolve the
 *   module's absolute file path.
 * @return {!string} absolute file path from Internet
 */
function resolve (id, base) {
	// step 1: parse built-in modules
	// step 2: normalize id and parse head part as alias
	// step 3: parse middle part as map
	// step 4: add file extension if necessary
    id = normalize(id);
    var conjuction = id[0] == '/' ? '' : '/';
    var url = (base ? dirname(base) : getPageDir()) + conjuction + id;

    if (!jsExtRegExp.test(url))
        url += '.js';

    //todo
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // `http://blog.stevenlevithan.com/archives/cross-browser-split`.
    url = url.split('/');
    for (var i = 0; i < url.length; ++i) {
        if (url[i] === '.') {
            url.splice(i, 1);
            --i;
        } else if (url[i] === '..' && i > 0 && url[i - 1] != '..') {
            url.splice(i - 1, 2);
            i -= 2;
        }
    }

    return url.join('/');
}


/**
 * Return the directory name of a path. Similar to the
 * Unix dirname command.
 *
 * Example:
 * path.dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {!string} p
 * @return {!string}
 */
function dirname(p) {
    if (dirRegExp.test(p))
        return p.slice(0, -1);
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // `http://blog.stevenlevithan.com/archives/cross-browser-split`.
    p = p.split('/');
    p.pop();
    return p.join('/');
}


function parseAlias() {

}


function parseMap() {

}