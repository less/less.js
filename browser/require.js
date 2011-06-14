//
// Stub out `require` in the browser
//
function require(arg) {
    return window.carto[arg.split('/')[1]];
};
