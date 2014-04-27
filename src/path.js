
// and a directory file path must be ends with a slash (back slash in window)
var dirRegExp = /\/$/g,
// whether a path to a file with extension
    fileExtRegExp = /\.(js|css|tpl|txt)$/g;


// retrieve current doc's absolute path
// It may be a file system path, http path
// or other protocol path
var loc = global.location;


/**
 * Normalize a string path, taking care of '..' and '.' parts.
 * This method perform identically with node path.normalize.
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
    p = p.replace(/(\/)+/g, "/");

    // step2: resolve '.' and '..'
    p = resolveDot(p);
    return p;
}


/**
 * resolve a path with a '.' or '..' part in it.
 * @param {string} p
 * @return {string}
 */
function resolveDot(p) {
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
    p = p.split("/");
    for (var i = 0; i < p.length; ++i) {
        if (p[i] == ".") {
            p.splice(i, 1);
            --i;
        } else if (p[i] == ".." && i > 0 && p[i - 1] != "..") {
            p.splice(i - 1, 2);
            i -= 2;
        }
    }
    return p.join("/");
}


/**
 * To get current doc's directory
 * @return {string}
 */
function getPageDir() {
    return dirname(loc.href);
}


/**
 * Judge if a path is top-level, such as 'core/class.js'
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isTopLevel(p) {
    return isRelative(p) && p[0] != ".";
}


/**
 * Return if a path is absolute.
 * In most web environment, absolute url starts with a 'http://' or 'https://';
 * In Windows File System, starts with a 'file:///' protocol;
 * In UNIX like System, starts with a single '/';
 *
 * @param {string} p Path to check.
 * @return {boolean} b Is p absolute?
 */
function isAbsolute(p) {
    return /:\/\//.test(p) || /^\//.test(p);
}


/**
 * Return if a path is relative.
 * In most web environment, relative path start with a single/double dot.
 * e.g: ../a/b/c; ./a/b
 *
 * Here we think topLevel path is a kind of relative path.
 *
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isRelative(p) {
    return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p[0] !== "/");
}


/**
 * Map the identifier for a module to a Internet file
 * path. SCRIPT insertion will set path with it, except
 * build-in names.
 *
 * @param {string} id Always the module's name or identifier.
 * @param {string?} base A relative baseuri for resolve the
 *   module's absolute file path.
 * @return {!(string|object)} exports object or absolute file path from Internet
 */
function resolveId(id, base) {
    // var _mod = kernel.cache.mods[id];
    if (id == "require" || id == "module" ||
        id == "exports" /*|| (_mod &&  _mod != empty_mod)*/)
        return id;

    if (isTopLevel(id)) {
        // step 1: normalize id and parse head part as paths
        id = parsePaths(id);
        // here if a top-level path then relative base change to
        // current document's baseUri.
        base = null;
    }

	// step 2: add file extension if necessary
    id = normalize(id);
    var conjuction = id[0] == "/" ? "" : "/";
    var url = (base ? dirname(base) : getPageDir()) + conjuction + id;

    if (!fileExtRegExp.test(url)) url += ".js";

    url = resolveDot(url);

    return url;
}


/**
 * Return the directory name of a path. Similar to the
 * UNIX dirname command.
 *
 * Example:
 * path.dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} p
 * @return {string}
 */
function dirname(p) {
    if (dirRegExp.test(p))
        return p.slice(0, -1);
    // Here I used to use /\//ig to split string, but unfortunately
    // it has serious bug in IE<9. See for more:
    // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
    p = p.split("/");
    p.pop();
    return p.join("/");
}


/**
 * Alias will appear at first word of path.
 * So replace it if exists in kernel.alias.
 * @param {string} p
 * @return {string} s
 */
function parseAlias(p) {
    var parts = p.split("/"),
        part = parts[0];
    if (kernel.alias[part]) {
        part = kernel.alias[part];
    }
    parts.shift();
    return [part].concat(parts).join("/");
}


/**
 * Alias will appear at first word of path.
 * So replace it if exists in kernel.paths.
 * @param {string} p
 * @return {string} s
 */
function parsePaths(p) {
    if (kernel.paths && kernel.paths[p]) {
        p = kernel.paths[p];
    }
    return p;
}
