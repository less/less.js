//
// Stub out `require` in the browser
//
window.carto = window.carto || {};
window.carto.underscore = window._;

function require(arg) {
    var mod = window.carto[arg];
    if(!mod) {
      mod = window.carto[arg.split('/')[1]];
    }
    if(!mod) {
      mod = window.carto[arg]
    }
    if(!mod) {
      mod = window[arg.split('/')[1]];
    }
    // try global scope
    if(!mod) {
      mod = window[arg]
    }
    return mod;
}
