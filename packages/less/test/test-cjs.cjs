// Replicates: "const less = require('less')" — how users report importing (Node, Webpack CJS)
console.log("Testing: require('less')...");

const less = require('less');

// Verify it's not a thenable (shouldn't be awaited accidentally)
if (typeof less.then === 'function') {
    console.error('CJS test FAILED: exports should not be thenable');
    process.exit(1);
}

// Test 1: Promise-based render
less.render('.class { width: (1 + 1) }')
    .then(function(output) {
        if (!output.css.includes('width: 2')) {
            console.error('CJS render test FAILED:', output.css);
            process.exit(1);
        }
        console.log('CJS render test PASSED');

        return new Promise(function(resolve, reject) {
            var callbackCompleted = false;
            var timer = setTimeout(function() {
                if (!callbackCompleted) {
                    reject(new Error('CJS callback test FAILED: callback was not invoked'));
                }
            }, 5000);

            // Test 2: Callback-based render
            less.render('.cb { color: red }', function(err, output) {
                callbackCompleted = true;
                clearTimeout(timer);
                if (err) {
                    reject(err);
                    return;
                }
                if (!output.css.includes('color: red')) {
                    reject(new Error('CJS callback test FAILED: ' + output.css));
                    return;
                }
                console.log('CJS callback test PASSED');
                resolve();
            });
        });
    })
    .then(function() {
        // Test 3: Property access (version) — available after load
        const version = less.version;
        if (!Array.isArray(version) || version.length !== 3) {
            console.error('CJS version test FAILED:', version);
            process.exit(1);
        }
        console.log('CJS version test PASSED:', version.join('.'));
    })
    .catch(function(err) {
        console.error('CJS test FAILED:', err);
        process.exit(1);
    });
