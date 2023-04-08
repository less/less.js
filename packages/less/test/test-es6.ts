// https://github.com/less/less.js/issues/3533
console.log('Testing ES6 imports...')

import less from '..';
const lessRender = less.render;

// then I call lessRender on something
lessRender(`
body {
    a: 1;
    b: 2;
    c: 30;
    d: 4;
}`, {sourceMap: {}},  function(error: any, output: any) {
    if (error)
        console.error(error)
})