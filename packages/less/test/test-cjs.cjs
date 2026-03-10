// Test that CJS require('less') works
console.log('Testing CJS require...');

const less = require('less');

if (typeof less.render !== 'function') {
    console.error('CJS test FAILED: less.render is not a function');
    process.exit(1);
}

// Test: Promise-based API
less.render('.class { width: (1 + 1) }')
    .then(function(output) {
        if (output.css.includes('width: 2')) {
            console.log('CJS require test PASSED');
        } else {
            console.error('CJS test FAILED:', output.css);
            process.exit(1);
        }
    })
    .catch(function(err) {
        console.error('CJS test FAILED:', err);
        process.exit(1);
    });
