//
// Stub out `require` in the browser
//
function require(arg) {
    var mod = window.carto[arg];
    if(!mod) {
      mod = window.carto[arg.split('/')[1]];
    }
    return mod;
}
