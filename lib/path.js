/**
 * @file paths utilities
 * @email zmike86@gmail.com
 */

// A directory file path must be ends with a slash (backslash in window)
var dirReg = /\/$/g;
var fileExtReg = /\.(js|css|txt)$/;
var dotCH = '.';
var slashCH = '/';
var dot2CH = '..';

// retrieve current doc's absolute path
// It may be a file system path, http path
// or other protocol path
var loc = global.location;

/**
 * Normalize a string path, taking care of '..' and '.' parts.
 * This method perform identically with node path.normalize.
 * When multiple slashes are found, they're replaced by a single one;
 * when the path contains a trailing slash, it is preserved.
 * On Windows backslashes are used in FileSystem.
 * e.g:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 * @param {string} p
 */
function normalize(p) {
  // step1: combine multi slashes
  p = p.replace(/(\/)+/g, slashCH);

  // step2: resolve '.' and '..'
  p = resolveDot(p);
  return p
}

/**
 * Resolve relative path such as '.' or '..'.
 * @param {string} path
 * @return {string}
 */
function resolveDot(path) {
  // Here I used to use /\//g to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  path = path.split(slashCH);
  for (var i = 0; i < path.length; ++i) {
    if (path[i] === dotCH) {
      path.splice(i, 1);
      --i
    } else if (path[i] === dot2CH && i > 0 && path[i - 1] !== dot2CH) {
      path.splice(i - 1, 2);
      i -= 2
    }
  }
  return path.join(slashCH)
}

/**
 * Judge if a path is top-level, such as 'core/class.js'
 * @param  {string} path Path to check.
 * @return {boolean}
 */
function isTopLevel(path) {
  // if we use array-like as string[index] will return undefined
  // in IE6 & 7, so we should use string.charAt(index) instead.
  // see more:
  // 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
  // +Global_Objects/String#section_5'
  return isRelative(path) && path.charAt(0) !== dotCH
}

/**
 * Return if a path is absolute.
 * In most web environment, absolute url starts with a 'http://' or 'https://';
 * In Windows File System, starts with a 'file:///' protocol;
 * In UNIX like System, starts with a single '/';
 * @param {string} path Path to check.
 * @return {boolean} Is path absolute?
 */
function isAbsolute(path) {
  return /:\/\//.test(path) || /^\//.test(path)
}

/**
 * Return if a path is relative.
 * In most web environment, relative path start with a single/double dot.
 * e.g: ../a/b/c; ./a/b
 * Here we think topLevel path is a kind of relative path.
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isRelative(p) {
  return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p.charAt(0) !== slashCH)
}

/**
 * Map the identifier for a module to a Internet file
 * path. script insertion will set path with it, except
 * build-in names.
 * @param  {string} id dependency's name or id.
 * @param  {string=} base As based uri, to help resolve path
 * @return {string|object} exports object or absolute file path from Internet
 */
function resolvePath(id, base) {
  if (isTopLevel(id)) {
    // normalize id and parse head part as paths
    id = parsePaths(id);
    // here if a top-level path then relative base change to
    // current document's baseUri.
    base = null
  }

  // add file extension if necessary
  id = normalize(id);
  var adjoin = id.charAt(0) === slashCH ? '' : slashCH;
  var url = (base ? dirname(base) : dirname(loc.href)) + adjoin + id;

  if (!fileExtReg.test(url)) {
    url += '.js'
  }

  return resolveDot(url)
}

/**
 * Similar to the UNIX dirname command.
 * Usage:
 * dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {string} path
 * @return {string}
 */
function dirname(path) {
  if (dirReg.test(path)) {
    return path.slice(0, -1)
  }
  // Here I used to use /\//ig to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  var ps = path.split(slashCH);
  ps.pop();
  return ps.join(slashCH)
}

/**
 * Search in kernel.data.paths configuration.
 * @param {string} p 依赖模块路径
 * @return {string} s 替换后的路径
 */
function parsePaths(p) {
  var ret = [];
  var paths = kernel.data.paths;
  if (paths) {
    var part = p;
    var parts = p.split(slashCH);
    while (!(part in paths) && parts.length) {
      ret.unshift(parts.pop());
      part = parts.join(slashCH)
    }
    p = paths[part] ? paths[part] : part
  }
  return p + ret.join(slashCH)
}
