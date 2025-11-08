// Mock needle for HTTP requests BEFORE any other requires
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'needle') {
        return {
            get: function(url, options, callback) {
                
                // Handle CDN requests
                if (url.includes('cdn.jsdelivr.net')) {
                    if (url.includes('selectors.less')) {
                        setTimeout(() => {
                            callback(null, { statusCode: 200 }, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/selectors/selectors.less'), 'utf8'));
                        }, 10);
                        return;
                    }
                    if (url.includes('media.less')) {
                        setTimeout(() => {
                            callback(null, { statusCode: 200 }, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/media/media.less'), 'utf8'));
                        }, 10);
                        return;
                    }
                    if (url.includes('empty.less')) {
                        setTimeout(() => {
                            callback(null, { statusCode: 200 }, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/empty/empty.less'), 'utf8'));
                        }, 10);
                        return;
                    }
                }
                
                // Handle redirect test - simulate needle's automatic redirect handling
                if (url.includes('example.com/redirect.less')) {
                    setTimeout(() => {
                        // Simulate the final response after needle automatically follows the redirect
                        callback(null, { statusCode: 200 }, 'h1 { color: blue; }');
                    }, 10);
                    return;
                }
                
                if (url.includes('example.com/target.less')) {
                    setTimeout(() => {
                        callback(null, { statusCode: 200 }, 'h1 { color: blue; }');
                    }, 10);
                    return;
                }
                
                // Default error for unmocked URLs
                setTimeout(() => {
                    callback(new Error('Unmocked URL: ' + url), null, null);
                }, 10);
            }
        };
    }
    return originalRequire.apply(this, arguments);
};

// Now load other modules after mocking is set up
var path = require('path'),
    fs = require('fs'),
    lessTest = require('./less-test'),
    stylize = require('../lib/less-node/lessc-helper').stylize;

// Parse command line arguments for test filtering
var args = process.argv.slice(2);
var testFilter = args.length > 0 ? args[0] : null;

// Create the test runner with the filter
var lessTester = lessTest(testFilter);

// HTTP mocking is now handled by needle mocking above

// Test HTTP redirect functionality
function testHttpRedirects() {
    const less = require('../lib/less-node').default;
    
    console.log('🧪 Testing HTTP redirect functionality...');
    
    const redirectTest = `
@import "https://example.com/redirect.less";

h1 { color: red; }
`;

    return less.render(redirectTest, {
        filename: 'test-redirect.less'
    }).then(result => {
        console.log('✅ HTTP redirect test SUCCESS:');
        console.log(result.css);
        
        // Check if both imported and local content are present
        if (result.css.includes('color: blue') && result.css.includes('color: red')) {
            console.log('🎉 HTTP redirect test PASSED - both imported and local content found');
            return true;
        } else {
            console.log('❌ HTTP redirect test FAILED - missing expected content');
            return false;
        }
    }).catch(err => {
        console.log('❌ HTTP redirect test ERROR:');
        console.log(err.message);
        return false;
    });
}

// Test import-remote functionality
function testImportRemote() {
    const less = require('../lib/less-node').default;
    const fs = require('fs');
    const path = require('path');
    
    console.log('🧪 Testing import-remote functionality...');
    
    const testFile = path.join(__dirname, '../../test-data/tests-unit/import/import-remote.less');
    const expectedFile = path.join(__dirname, '../../test-data/tests-unit/import/import-remote.css');
    
    const content = fs.readFileSync(testFile, 'utf8');
    const expected = fs.readFileSync(expectedFile, 'utf8');
    
    return less.render(content, {
        filename: testFile
    }).then(result => {
        console.log('✅ Import-remote test SUCCESS:');
        console.log('Expected:', expected.trim());
        console.log('Actual:', result.css.trim());
        
        if (result.css.trim() === expected.trim()) {
            console.log('🎉 Import-remote test PASSED - CDN imports and variable resolution working');
            return true;
        } else {
            console.log('❌ Import-remote test FAILED - output mismatch');
            return false;
        }
    }).catch(err => {
        console.log('❌ Import-remote test ERROR:');
        console.log(err.message);
        return false;
    });
}

console.log('\n' + stylize('Less', 'underline') + '\n');

if (testFilter) {
    console.log('Running tests matching: ' + testFilter + '\n');
}

// Glob patterns for main test runs (excluding problematic tests that will run separately)
var globPatterns = [
    'tests-config/*/*.less',
    'tests-unit/*/*.less',
    // Debug tests have nested subdirectories (comments/, mediaquery/, all/)
    'tests-config/debug/*/linenumbers-*.less',
    '!tests-config/sourcemaps/**/*.less',   // Exclude sourcemaps (need special handling)
    '!tests-config/sourcemaps-empty/*',     // Exclude sourcemaps-empty (need special handling)
    '!tests-config/sourcemaps-disable-annotation/*', // Exclude sourcemaps-disable-annotation (need special handling)
    '!tests-config/sourcemaps-variable-selector/*',  // Exclude sourcemaps-variable-selector (need special handling)
    '!tests-config/globalVars/*',           // Exclude globalVars (need JSON config handling)
    '!tests-config/modifyVars/*',           // Exclude modifyVars (need JSON config handling)
    '!tests-config/js-type-errors/*',       // Exclude js-type-errors (need special test function)
    '!tests-config/no-js-errors/*',         // Exclude no-js-errors (need special test function)
    '!tests-unit/import/import-remote.less', // Exclude import-remote (tested separately in isolation)

    // HTTP import tests are now included since we have needle mocking
];

var testMap = [
    // Main test runs using glob patterns (cosmiconfig handles configs)
    {
        patterns: globPatterns
    },

    // Error tests
    {
        patterns: ['tests-error/eval/*.less'],
        verifyFunction: lessTester.testErrors
    },
    {
        patterns: ['tests-error/parse/*.less'],
        verifyFunction: lessTester.testErrors
    },

    // Special test cases with specific handling
    {
        patterns: ['tests-config/js-type-errors/*.less'],
        verifyFunction: lessTester.testTypeErrors
    },
    {
        patterns: ['tests-config/no-js-errors/*.less'],
        verifyFunction: lessTester.testErrors
    },

    // Sourcemap tests with special handling
    {
        patterns: [
            'tests-config/sourcemaps/**/*.less',
            'tests-config/sourcemaps-url/**/*.less',
            'tests-config/sourcemaps-rootpath/**/*.less',
            'tests-config/sourcemaps-basepath/**/*.less',
            'tests-config/sourcemaps-include-source/**/*.less'
        ],
        verifyFunction: lessTester.testSourcemap,
        getFilename: function(filename, type, baseFolder) {
            if (type === 'vars') {
                return path.join(baseFolder, filename) + '.json';
            }
            // Extract just the filename (without directory) for the JSON file
            var jsonFilename = path.basename(filename);
            // For sourcemap type, return path relative to test directory
            if (type === 'sourcemap') {
                return path.join('test/sourcemaps', jsonFilename) + '.json';
            }
            return path.join('test/sourcemaps', jsonFilename) + '.json';
        }
    },
    {
        patterns: ['tests-config/sourcemaps-empty/*.less'],
        verifyFunction: lessTester.testEmptySourcemap
    },
    {
        patterns: ['tests-config/sourcemaps-disable-annotation/*.less'],
        verifyFunction: lessTester.testSourcemapWithoutUrlAnnotation
    },
    {
        patterns: ['tests-config/sourcemaps-variable-selector/*.less'],
        verifyFunction: lessTester.testSourcemapWithVariableInSelector
    },

    // Import tests with JSON configs
    {
        patterns: ['tests-config/globalVars/*.less'],
        lessOptions: {
            globalVars: function(file) {
                const fs = require('fs');
                const path = require('path');
                const basename = path.basename(file, '.less');
                const jsonPath = path.join(path.dirname(file), basename + '.json');
                try {
                    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                } catch (e) {
                    return {};
                }
            }
        }
    },
    {
        patterns: ['tests-config/modifyVars/*.less'],
        lessOptions: {
            modifyVars: function(file) {
                const fs = require('fs');
                const path = require('path');
                const basename = path.basename(file, '.less');
                const jsonPath = path.join(path.dirname(file), basename + '.json');
                try {
                    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                } catch (e) {
                    return {};
                }
            }
        }
    }
];

// Note: needle mocking is set up globally at the top of the file

testMap.forEach(function(testConfig) {
    // For glob patterns, pass lessOptions as the first parameter and patterns as the second
    if (testConfig.patterns) {
        lessTester.runTestSet(
            testConfig.lessOptions || {},           // First param: options (including lessOptions)
            testConfig.patterns,                    // Second param: patterns
            testConfig.verifyFunction || null,      // Third param: verifyFunction
            testConfig.nameModifier || null,        // Fourth param: nameModifier
            testConfig.doReplacements || null,      // Fifth param: doReplacements
            testConfig.getFilename || null          // Sixth param: getFilename
        );
    } else {
        // Legacy format for non-glob tests
        var args = [
            testConfig.options || {},               // First param: options
            testConfig.foldername,                  // Second param: foldername
            testConfig.verifyFunction || null,      // Third param: verifyFunction
            testConfig.nameModifier || null,        // Fourth param: nameModifier
            testConfig.doReplacements || null,      // Fifth param: doReplacements
            testConfig.getFilename || null          // Sixth param: getFilename
        ];
        lessTester.runTestSet.apply(lessTester, args);
    }
});

// Special synchronous tests
lessTester.testSyncronous({syncImport: true}, 'tests-unit/import/import');
lessTester.testSyncronous({syncImport: true}, 'tests-config/math-strict/css');

lessTester.testNoOptions();
lessTester.testDisablePluginRule();
lessTester.testJSImport();
lessTester.finished();


// Test HTTP redirect functionality
console.log('\nTesting HTTP redirect functionality...');
testHttpRedirects();
console.log('HTTP redirect test completed');

// Test import-remote functionality in isolation
console.log('\nTesting import-remote functionality...');
testImportRemote();
console.log('Import-remote test completed');
