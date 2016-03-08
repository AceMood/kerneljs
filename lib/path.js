/**
 * @file
 * @email zmike86@gmail.com
 */

// A directory file path must be ends with a slash (back slash in window)
var dirRegExp = /\/$/g,
  fileExtRegExp = /\.(js|css|tpl|txt)$/,
  dot = '.',
  slash = '/',
  dot2 = '..';

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
 *
 * Example:
 * path.normalize('/foo/bar//baz/asdf/quux/..')
 * returns '/foo/bar/baz/asdf'
 * @param {string} p
 */
function normalize(p) {
  // step1: combine multi slashes
  p = p.replace(/(\/)+/g, slash);

  // step2: resolve '.' and '..'
  p = resolveDot(p);
  return p;
}

/**
 * Resolve relative path such as '.' or '..'.
 * @param {string} p
 * @return {string}
 */
function resolveDot(p) {
  // Here I used to use /\//ig to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  p = p.split(slash);
  for (var i = 0; i < p.length; ++i) {
    if (p[i] === dot) {
      p.splice(i, 1);
      --i;
    } else if (p[i] === dot2 && i > 0 && p[i - 1] !== dot2) {
      p.splice(i - 1, 2);
      i -= 2;
    }
  }
  return p.join(slash);
}

/**
 * Judge if a path is top-level, such as 'core/class.js'
 * @param  {string} p Path to check.
 * @return {boolean} b
 */
function isTopLevel(p) {
  // if we use array-like as string[index] will return undefined
  // in IE6 & 7, so we should use string.charAt(index) instead.
  // see more:
  // 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/
  // +Global_Objects/String#section_5'
  return isRelative(p) && p.charAt(0) !== dot;
}

/**
 * Return if a path is absolute.
 * In most web environment, absolute url starts with a 'http://' or 'https://';
 * In Windows File System, starts with a 'file:///' protocol;
 * In UNIX like System, starts with a single '/';
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
 * Here we think topLevel path is a kind of relative path.
 * @param {string} p Path to check.
 * @return {boolean} b
 */
function isRelative(p) {
  return !isAbsolute(p) && (/^(\.){1,2}\//.test(p) || p.charAt(0) !== slash);
}

/**
 * Map the identifier for a module to a Internet file
 * path. SCRIPT insertion will set path with it, except
 * build-in names.
 *
 * @param  {string} id 依赖模块的name或者id。
 * @param  {string=} base 作为baseUri，解析依赖模块的绝对路径。
 * @return {string|object} exports object or absolute file path from Internet
 */
function resolvePath(id, base) {
  if (isTopLevel(id)) {
    // step 1: normalize id and parse head part as paths
    id = parsePaths(id);
    // step 2: normalize id and parse head part as pkgs
    id = parsePackages(id);
    // here if a top-level path then relative base change to
    // current document's baseUri.
    base = null;
  }

  // step 3: add file extension if necessary
  id = normalize(id);
  var conjuction = id.charAt(0) === slash ? '' : slash;
  var url = (base ? dirname(base) : dirname(loc.href)) + conjuction + id;

  if (!fileExtRegExp.test(url)) {
    url += '.js';
  }

  url = resolveDot(url);

  return url;
}

/**
 * 提取路径中的目录名. Similar to the
 * UNIX dirname command.
 * Usage:
 * dirname('/foo/bar/baz/asdf/quux')
 * returns '/foo/bar/baz/asdf'
 *
 * @param {String} p
 * @return {String}
 */
function dirname(p) {
  if (dirRegExp.test(p)) {
    return p.slice(0, -1);
  }
  // Here I used to use /\//ig to split string, but unfortunately
  // it has serious bug in IE<9. See for more:
  // 'http://blog.stevenlevithan.com/archives/cross-browser-split'.
  var ps = p.split(slash);
  ps.pop();
  return ps.join(slash);
}

/**
 * paths设置的别名会出现在路径的头部。
 * 根据kerneljs.paths替换
 * @param {String} p 依赖模块路径
 * @return {String} s 替换后的路径
 */
function parsePaths(p) {
  var ret = [];
  var paths = kerneljs.data.paths;
  if (paths) {
    var part = p;
    var parts = p.split(slash);
    while (!(part in paths) && parts.length) {
      ret.unshift(parts.pop());
      part = parts.join(slash);
    }
    p = paths[part] ? paths[part] : part;
  }
  return p + ret.join(slash);
}

/**
 * package名称配置也会影响路径解析.
 * 在paths解析后, 需要处理package configuration.
 * @param {String} p
 * @return {String} s
 */
function parsePackages(p) {
  var pkgs = kerneljs.data.packages,
    fpath = '';
  if (pkgs && pkgs.length > 0) {
    forEach(pkgs, function(pkg) {
      // starts with a package name
      if (p.indexOf(pkg.name) === 0) {
        // absolutely equal
        if (p.length === pkg.name.length) {
          fpath = slash + (pkg.main ? pkg.main : 'main');
        }
        p = p.replace(pkg.name, pkg.location || pkg.name) + fpath;
        return break_obj;
      }
    });
  }
  return p;
}
