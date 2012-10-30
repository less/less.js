/**
 * cssinclude.js
 * Extend syntax @import "some.css"
 * to actualy css file contents when imported css exist.
 * If imported css file isn't exist, not execute replace.
 *
 * * usage *
 * var cssString
 * cssString = require('./cssinclude').extend(cssString);
 *
 *
 */

var path = require('path');
var fs = require("fs");
CssInclude = {};

/**
 * Extend import if css file E
 * @param  {String} css   css content string
 * @param  {Array}  paths import resolve path
 * @return {String}       extended css
 */
CssInclude.extend = function(css, paths){
  var regexp = /@import\s.+;/g
  var importMatches = css.match(regexp);
  if(importMatches == null){
    return css;
  }

  for(var i=0; i < importMatches.length ; i++){
    css = this.replaceImport(css, paths, importMatches[i]);
  }

  return css;
}

CssInclude.replaceImport = function(css, paths, importSyntax){
  // @see less.js/parser.js
  var fileRegexp = /"((?:[^"\\\r\n]|\\.)*)"|'((?:[^'\\\r\n]|\\.)*)'/;
  if(fileRegexp.test(importSyntax) == false){
    return css;
  }

  var matches = importSyntax.match(fileRegexp);
  var fileName = matches[1] || matches[2];
  if(/\.css$/.test(fileName) == false){
    return css;
  }

  var filePath = this.resolvePath(fileName, paths);
  if(filePath){
    var cssString = fs.readFileSync(filePath,'utf8');
    css = css.replace(importSyntax, cssString);
  }
  return css;
}

/**
 * Find exist file.
 * @see less/lib/index.js
 * @param  {String} file  Search file
 * @param  {Array}  paths Search paths
 * @return {String}
 */
CssInclude.resolvePath = function(file, paths){
  var pathname;

  paths.unshift('.');
  for (var i = 0; i < paths.length; i++) {
    try {
      pathname = path.join(paths[i], file);
      fs.statSync(pathname);
      break;
    } catch (e) {
      pathname = null;
    }
  }
  return pathname;
}

module.exports = CssInclude;
