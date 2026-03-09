import { createRequire } from 'module';
import Module from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import less from '../lib/less-node/index.js';
import { stylize } from '../lib/less-node/lessc-helper.js';
import createLessTester from './less-test.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock needle for HTTP requests
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

                // Handle redirect test
                if (url.includes('example.com/redirect.less')) {
                    setTimeout(() => {
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

// Parse command line arguments for test filtering
var args = process.argv.slice(2);
var testFilter = args.length > 0 ? args[0] : null;

// Create the test runner with the filter
var lessTester = createLessTester(testFilter);

// Test HTTP redirect functionality
function testHttpRedirects() {
    console.log('Testing HTTP redirect functionality...');

    const redirectTest = `
@import "https://example.com/redirect.less";

h1 { color: red; }
`;

    return less.render(redirectTest, {
        filename: 'test-redirect.less'
    }).then(result => {
        console.log('HTTP redirect test SUCCESS:');
        console.log(result.css);

        if (result.css.includes('color: blue') && result.css.includes('color: red')) {
            console.log('HTTP redirect test PASSED - both imported and local content found');
            return true;
        } else {
            console.log('HTTP redirect test FAILED - missing expected content');
            return false;
        }
    }).catch(err => {
        console.log('HTTP redirect test ERROR:');
        console.log(err.message);
        return false;
    });
}

// Test import-remote functionality
function testImportRemote() {
    console.log('Testing import-remote functionality...');

    const testFile = path.join(__dirname, '../../test-data/tests-unit/import/import-remote.less');
    const expectedFile = path.join(__dirname, '../../test-data/tests-unit/import/import-remote.css');

    const content = fs.readFileSync(testFile, 'utf8');
    const expected = fs.readFileSync(expectedFile, 'utf8');

    return less.render(content, {
        filename: testFile
    }).then(result => {
        console.log('Import-remote test SUCCESS:');
        console.log('Expected:', expected.trim());
        console.log('Actual:', result.css.trim());

        if (result.css.trim() === expected.trim()) {
            console.log('Import-remote test PASSED - CDN imports and variable resolution working');
            return true;
        } else {
            console.log('Import-remote test FAILED - output mismatch');
            return false;
        }
    }).catch(err => {
        console.log('Import-remote test ERROR:');
        console.log(err.message);
        return false;
    });
}

console.log('\n' + stylize('Less', 'underline') + '\n');

if (testFilter) {
    console.log('Running tests matching: ' + testFilter + '\n');
}

var globPatterns = [
    'tests-config/*/*.less',
    'tests-unit/*/*.less',
    'tests-config/debug/*/linenumbers-*.less',
    '!tests-config/sourcemaps/**/*.less',
    '!tests-config/sourcemaps-empty/*',
    '!tests-config/sourcemaps-disable-annotation/*',
    '!tests-config/sourcemaps-variable-selector/*',
    '!tests-config/globalVars/*',
    '!tests-config/modifyVars/*',
    '!tests-config/js-type-errors/*',
    '!tests-config/no-js-errors/*',
    '!tests-unit/import/import-remote.less',
];

var testMap = [
    { patterns: globPatterns },
    { patterns: ['tests-error/eval/*.less'], verifyFunction: lessTester.testErrors },
    { patterns: ['tests-error/parse/*.less'], verifyFunction: lessTester.testErrors },
    { patterns: ['tests-config/js-type-errors/*.less'], verifyFunction: lessTester.testTypeErrors },
    { patterns: ['tests-config/no-js-errors/*.less'], verifyFunction: lessTester.testErrors },
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
            var jsonFilename = path.basename(filename);
            return path.join('test/sourcemaps', jsonFilename) + '.json';
        }
    },
    { patterns: ['tests-config/sourcemaps-empty/*.less'], verifyFunction: lessTester.testEmptySourcemap },
    { patterns: ['tests-config/sourcemaps-disable-annotation/*.less'], verifyFunction: lessTester.testSourcemapWithoutUrlAnnotation },
    { patterns: ['tests-config/sourcemaps-variable-selector/*.less'], verifyFunction: lessTester.testSourcemapWithVariableInSelector },
    {
        patterns: ['tests-config/globalVars/*.less'],
        lessOptions: {
            globalVars: function(file) {
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

testMap.forEach(function(testConfig) {
    if (testConfig.patterns) {
        lessTester.runTestSet(
            testConfig.lessOptions || {},
            testConfig.patterns,
            testConfig.verifyFunction || null,
            testConfig.nameModifier || null,
            testConfig.doReplacements || null,
            testConfig.getFilename || null
        );
    } else {
        lessTester.runTestSet.apply(lessTester, [
            testConfig.options || {},
            testConfig.foldername,
            testConfig.verifyFunction || null,
            testConfig.nameModifier || null,
            testConfig.doReplacements || null,
            testConfig.getFilename || null
        ]);
    }
});

lessTester.testSyncronous({syncImport: true}, 'tests-unit/import/import');
lessTester.testSyncronous({syncImport: true}, 'tests-config/math-strict/css');

lessTester.testNoOptions();
lessTester.testDisablePluginRule();
lessTester.testJSImport();
lessTester.finished();

console.log('\nTesting HTTP redirect functionality...');
testHttpRedirects();
console.log('HTTP redirect test completed');

console.log('\nTesting import-remote functionality...');
testImportRemote();
console.log('Import-remote test completed');
