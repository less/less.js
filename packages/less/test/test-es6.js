// https://github.com/less/less.js/issues/3533
console.log('Testing ES6 imports...')

import less from 'less';

// Test 1: Promise-based API (await)
const output = await less.render('.class { width: (1 + 1) }');
if (output.css.includes('width: 2')) {
    console.log('Promise/await test PASSED');
} else {
    console.error('Promise/await test FAILED:', output.css);
    process.exit(1);
}

// Test 2: Callback-based API
less.render(`
body {
    a: 1;
    b: 2;
    c: 30;
    d: 4;
}`, {sourceMap: {}},  function(error, output) {
    if (error) {
        console.error('Callback test FAILED:', error);
        process.exit(1);
    }
    console.log('Callback test PASSED');
})
