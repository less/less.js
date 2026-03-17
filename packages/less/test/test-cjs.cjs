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

        // Test 2: Callback-based render
        less.render('.cb { color: red }', function(err, output) {
            if (err) {
                console.error('CJS callback test FAILED:', err);
                process.exit(1);
            }
            if (!output.css.includes('color: red')) {
                console.error('CJS callback test FAILED:', output.css);
                process.exit(1);
            }
            console.log('CJS callback test PASSED');

            // Test 3: Property access (version) — available after load
            const version = less.version;
            if (!Array.isArray(version) || version.length !== 3) {
                console.error('CJS version test FAILED:', version);
                process.exit(1);
            }
            console.log('CJS version test PASSED:', version.join('.'));
        });
    })
    .catch(function(err) {
        console.error('CJS test FAILED:', err);
        process.exit(1);
    });
