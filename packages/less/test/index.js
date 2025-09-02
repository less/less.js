var path = require('path'),
    fs = require('fs'),
    lessTest = require('./less-test'),
    stylize = require('../lib/less-node/lessc-helper').stylize,
    nock = require('nock');

// Ensure nock is properly configured
nock.enableNetConnect('localhost');
nock.enableNetConnect('127.0.0.1');
nock.disableNetConnect();

// Parse command line arguments for test filtering
var args = process.argv.slice(2);
var testFilter = args.length > 0 ? args[0] : null;

// Create the test runner with the filter
var lessTester = lessTest(testFilter);

// Set up global nock mocks for tests that need them
console.log('DEBUG: Setting up global nock mocks...');

// Mock CDN URLs for import-remote test
nock('https://cdn.jsdelivr.net')
    .persist()
    .get('/npm/@less/test-data/less/_main/selectors.less')
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/selectors/selectors.less'), 'utf8'))
    .get('/npm/@less/test-data/less/_main/media.less')
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/media/media.less'), 'utf8'))
    .get('/npm/@less/test-data/less/_main/empty.less')
    .query(true)
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/empty/empty.less'), 'utf8'));

// Mock redirect for import-redirect test
nock('https://example.com')
    .persist()
    .get('/redirect.less').query(true)
    .reply(301, null, { location: '/target.less' })
    .get('/target.less').query(true)
    .reply(200);

console.log('DEBUG: Global nock mocks set up for CDN and redirect tests');

console.log('\n' + stylize('Less', 'underline') + '\n');

if (testFilter) {
    console.log('Running tests matching: ' + testFilter + '\n');
}

// Glob patterns for main test runs (excluding problematic tests that will run separately)
var globPatterns = [
    'tests-config/*/*.less',
    'tests-unit/*/*.less',
    '!tests-config/sourcemaps/*',           // Exclude sourcemaps (need special handling)
    '!tests-config/sourcemaps-empty/*',     // Exclude sourcemaps-empty (need special handling)
    '!tests-config/sourcemaps-disable-annotation/*', // Exclude sourcemaps-disable-annotation (need special handling)
    '!tests-config/sourcemaps-variable-selector/*',  // Exclude sourcemaps-variable-selector (need special handling)
    '!tests-config/globalVars/*',           // Exclude globalVars (need JSON config handling)
    '!tests-config/modifyVars/*',           // Exclude modifyVars (need JSON config handling)
    '!tests-config/js-type-errors/*',       // Exclude js-type-errors (need special test function)
    '!tests-config/no-js-errors/*',         // Exclude no-js-errors (need special test function)

    '!tests-config/import-redirect/*',      // Exclude import-redirect (will run separately)
    '!tests-unit/import/import-remote.less', // Exclude import-remote (will run separately)
    '!tests-unit/import/import-inline.less', // Exclude import-inline (will run separately)
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
        patterns: ['tests-config/sourcemaps/*.less'],
        verifyFunction: lessTester.testSourcemap,
        getFilename: function(filename, type, baseFolder) {
            if (type === 'vars') {
                return path.join(baseFolder, filename) + '.json';
            }
            return path.join('test/sourcemaps', filename) + '.json';
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

// Note: nock mocks are set up globally at the top of the file

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


// Run problematic tests directly with clean nock setup
console.log('\nRunning problematic tests with clean nock setup...');

// Clean up any existing nock mocks and set up fresh ones
nock.cleanAll();

// Set up fresh nock mocks for these specific tests
nock('https://cdn.jsdelivr.net')
    .persist()
    .get('/npm/@less/test-data/less/_main/selectors.less')
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/selectors/selectors.less'), 'utf8'))
    .get('/npm/@less/test-data/less/_main/media.less')
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/media/media.less'), 'utf8'))
    .get('/npm/@less/test-data/less/_main/empty.less')
    .query(true)
    .reply(200, fs.readFileSync(path.join(__dirname, '../../test-data/tests-unit/empty/empty.less'), 'utf8'));

nock('https://example.com')
    .persist()
    .get('/redirect.less').query(true)
    .reply(301, null, { location: '/target.less' })
    .get('/target.less').query(true)
    .reply(200);

console.log('Fresh nock mocks set up for problematic tests');

// Run the problematic tests
lessTester.runTestSet({}, 'tests-config/import-redirect/', lessTester.testImportRedirect());

// Run specific problematic import files
lessTester.runTestSet({}, ['tests-unit/import/import-remote.less']);
lessTester.runTestSet({}, ['tests-unit/import/import-inline.less']);

console.log('Problematic tests completed');
