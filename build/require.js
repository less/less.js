//
// Stub out `require` in the browser
//
/* function require(arg) {
    return window.less[arg.split('/')[1]];
}; */

//adjustment to allow for browser and server support
function require(arg) {
  if (arg == './tree' || arg == '../tree') {
    if (tree === undefined)
      tree = {};
    return tree;
  }
  else
    return less[arg.split('/')[1]];
};