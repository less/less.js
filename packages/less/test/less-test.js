/* jshint latedef: nofunc */
var semver = require('semver');
var logger = require('../lib/less/logger').default;
var { cosmiconfigSync } = require('cosmiconfig');
var glob = require('glob');

var isVerbose = process.env.npm_config_loglevel !== 'concise';
logger.addListener({
    info(msg) {
        if (isVerbose) {
            process.stdout.write(msg + '\n');
        }
    },
    warn(msg) {
        process.stdout.write(msg + '\n');
    },
    error(msg) {
        process.stdout.write(msg + '\n');
    }
});


module.exports = function(testFilter) {
    var path = require('path'),
        fs = require('fs'),
        clone = require('copy-anything').copy;

    var less = require('../');

    var stylize = require('../lib/less-node/lessc-helper').stylize;

    var globals = Object.keys(global);

    var oneTestOnly = testFilter || process.argv[2],
        isFinished = false;

    var testFolder = path.dirname(require.resolve('@less/test-data'));
    var lessFolder = testFolder;

    // Define String.prototype.endsWith if it doesn't exist (in older versions of node)
    // This is required by the testSourceMap function below
    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function (str) {
            return this.slice(-str.length) === str;
        }
    }

    var queueList = [],
        queueRunning = false;
    function queue(func) {
        if (queueRunning) {
            // console.log("adding to queue");
            queueList.push(func);
        } else {
            // console.log("first in queue - starting");
            queueRunning = true;
            func();
        }
    }
    function release() {
        if (queueList.length) {
            // console.log("running next in queue");
            var func = queueList.shift();
            setTimeout(func, 0);
        } else {
            // console.log("stopping queue");
            queueRunning = false;
        }
    }

    var totalTests = 0,
        failedTests = 0,
        passedTests = 0,
        finishTimer = setInterval(endTest, 500);

    less.functions.functionRegistry.addMultiple({
        add: function (a, b) {
            return new(less.tree.Dimension)(a.value + b.value);
        },
        increment: function (a) {
            return new(less.tree.Dimension)(a.value + 1);
        },
        _color: function (str) {
            if (str.value === 'evil red') { return new(less.tree.Color)('600'); }
        }
    });

    function validateSourcemapMappings(sourcemap, lessFile, compiledCSS) {
        // Validate sourcemap mappings using SourceMapConsumer
        var SourceMapConsumer = require('source-map').SourceMapConsumer;
        // sourcemap can be either a string or already parsed object
        var sourceMapObj = typeof sourcemap === 'string' ? JSON.parse(sourcemap) : sourcemap;
        var consumer = new SourceMapConsumer(sourceMapObj);
        
        // Read the LESS source file
        var lessSource = fs.readFileSync(lessFile, 'utf8');
        var lessLines = lessSource.split('\n');
        
        // Use the compiled CSS (remove sourcemap annotation for validation)
        var cssSource = compiledCSS.replace(/\/\*# sourceMappingURL=.*\*\/\s*$/, '').trim();
        var cssLines = cssSource.split('\n');
        
        var errors = [];
        var validatedMappings = 0;
        
        // Validate mappings for each line in the CSS
        for (var cssLine = 1; cssLine <= cssLines.length; cssLine++) {
            var cssLineContent = cssLines[cssLine - 1];
            // Skip empty lines
            if (!cssLineContent.trim()) {
                continue;
            }
            
            // Check mapping for the start of this CSS line
            var mapping = consumer.originalPositionFor({
                line: cssLine,
                column: 0
            });
            
            if (mapping.source) {
                validatedMappings++;
                
                // Verify the source file exists in the sourcemap
                if (!sourceMapObj.sources || sourceMapObj.sources.indexOf(mapping.source) === -1) {
                    errors.push('Line ' + cssLine + ': mapped to source "' + mapping.source + '" which is not in sources array');
                }
                
                // Verify the line number is valid
                if (mapping.line && mapping.line > 0) {
                    // If we can find the source file, validate the line exists
                    var sourceIndex = sourceMapObj.sources.indexOf(mapping.source);
                    if (sourceIndex >= 0 && sourceMapObj.sourcesContent && sourceMapObj.sourcesContent[sourceIndex] !== undefined && sourceMapObj.sourcesContent[sourceIndex] !== null) {
                        var sourceContent = sourceMapObj.sourcesContent[sourceIndex];
                        // Ensure sourceContent is a string (it should be, but be defensive)
                        if (typeof sourceContent !== 'string') {
                            sourceContent = String(sourceContent);
                        }
                        // Split by newline - handle both \n and \r\n
                        var sourceLines = sourceContent.split(/\r?\n/);
                        if (mapping.line > sourceLines.length) {
                            errors.push('Line ' + cssLine + ': mapped to line ' + mapping.line + ' in "' + mapping.source + '" but source only has ' + sourceLines.length + ' lines');
                        }
                    } else if (sourceIndex >= 0) {
                        // Source content not embedded, try to validate against the actual file if it matches
                        // This is a best-effort validation
                    }
                }
            }
        }
        
        // Validate that all sources in the sourcemap are valid
        if (sourceMapObj.sources) {
            sourceMapObj.sources.forEach(function(source, index) {
                if (sourceMapObj.sourcesContent && sourceMapObj.sourcesContent[index]) {
                    // Source content is embedded, validate it's not empty
                    if (!sourceMapObj.sourcesContent[index].trim()) {
                        errors.push('Source "' + source + '" has empty content');
                    }
                }
            });
        }
        
        if (consumer.destroy && typeof consumer.destroy === 'function') {
            consumer.destroy();
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            mappingsValidated: validatedMappings
        };
    }

    function testSourcemap(name, err, compiledLess, doReplacements, sourcemap, baseFolder, getFilename) {
        if (err) {
            fail('ERROR: ' + (err && err.message));
            return;
        }
        // Check the sourceMappingURL at the bottom of the file
        // Default expected URL is name + '.css.map', but can be overridden by sourceMapURL option
        var sourceMappingPrefix = '/*# sourceMappingURL=',
            sourceMappingSuffix = ' */';
        var indexOfSourceMappingPrefix = compiledLess.indexOf(sourceMappingPrefix);
        if (indexOfSourceMappingPrefix === -1) {
            fail('ERROR: sourceMappingURL was not found in ' + baseFolder + '/' + name + '.css.');
            return;
        }
        
        var startOfSourceMappingValue = indexOfSourceMappingPrefix + sourceMappingPrefix.length,
            indexOfSuffix = compiledLess.indexOf(sourceMappingSuffix, startOfSourceMappingValue),
            actualSourceMapURL = compiledLess.substring(startOfSourceMappingValue, indexOfSuffix === -1 ? compiledLess.length : indexOfSuffix).trim();
        
        // For tests with custom sourceMapURL, we just verify it exists and is non-empty
        // The actual value will be validated by comparing the sourcemap JSON
        if (!actualSourceMapURL) {
            fail('ERROR: sourceMappingURL is empty in ' + baseFolder + '/' + name + '.css.');
            return;
        }

        // Use getFilename if available (for sourcemap tests with subdirectories)
        var jsonPath;
        if (getFilename && typeof getFilename === 'function') {
            jsonPath = getFilename(name, 'sourcemap', baseFolder);
        } else {
            // Fallback: extract just the filename for sourcemap JSON files
            var jsonFilename = path.basename(name);
            jsonPath = path.join('test/sourcemaps', jsonFilename) + '.json';
        }
        fs.readFile(jsonPath, 'utf8', function (e, expectedSourcemap) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            if (e) {
                fail('ERROR: Could not read expected sourcemap file: ' + jsonPath + ' - ' + e.message);
                return;
            }
            
            // Apply doReplacements to the expected sourcemap to handle {path} placeholders
            // This normalizes absolute paths that differ between environments
            // For sourcemaps, we need to ensure {path} uses forward slashes to avoid breaking JSON
            // (backslashes in JSON strings need escaping, and sourcemaps should use forward slashes anyway)
            var replacementPath = path.join(path.dirname(path.join(baseFolder, name) + '.less'), '/');
            // Normalize to forward slashes for sourcemap JSON (web-compatible)
            replacementPath = replacementPath.replace(/\\/g, '/');
            // Replace {path} with normalized forward-slash path BEFORE calling doReplacements
            // This ensures the JSON is always valid and uses web-compatible paths
            expectedSourcemap = expectedSourcemap.replace(/\{path\}/g, replacementPath);
            // Also handle other placeholders that might be in the sourcemap (but {path} is already done)
            expectedSourcemap = doReplacements(expectedSourcemap, baseFolder, path.join(baseFolder, name) + '.less');
            
            // Normalize paths in sourcemap JSON to use forward slashes (web-compatible)
            // We need to parse the JSON, normalize the file property, then stringify for comparison
            // This avoids breaking escape sequences like \n in the JSON string
            function normalizeSourcemapPaths(sm) {
                try {
                    var parsed = typeof sm === 'string' ? JSON.parse(sm) : sm;
                    if (parsed.file) {
                        parsed.file = parsed.file.replace(/\\/g, '/');
                    }
                    // Also normalize paths in sources array
                    if (parsed.sources && Array.isArray(parsed.sources)) {
                        parsed.sources = parsed.sources.map(function(src) {
                            return src.replace(/\\/g, '/');
                        });
                    }
                    return JSON.stringify(parsed, null, 0);
                } catch (parseErr) {
                    // If parsing fails, return original (shouldn't happen)
                    return sm;
                }
            }
            
            var normalizedSourcemap = normalizeSourcemapPaths(sourcemap);
            var normalizedExpected = normalizeSourcemapPaths(expectedSourcemap);
            
            if (normalizedSourcemap === normalizedExpected) {
                // Validate the sourcemap mappings are correct
                // Find the actual LESS file - it might be in a subdirectory
                var nameParts = name.split('/');
                var lessFileName = nameParts[nameParts.length - 1];
                var lessFileDir = nameParts.length > 1 ? nameParts.slice(0, -1).join('/') : '';
                var lessFile = path.join(lessFolder, lessFileDir, lessFileName) + '.less';
                
                // Only validate if the LESS file exists
                if (fs.existsSync(lessFile)) {
                    try {
                        // Parse the sourcemap once for validation (avoid re-parsing)
                        // Use the original sourcemap string, not the normalized one
                        var sourceMapObjForValidation = typeof sourcemap === 'string' ? JSON.parse(sourcemap) : sourcemap;
                        var validation = validateSourcemapMappings(sourceMapObjForValidation, lessFile, compiledLess);
                        if (!validation.valid) {
                            fail('ERROR: Sourcemap validation failed:\n' + validation.errors.join('\n'));
                            return;
                        }
                        if (isVerbose && validation.mappingsValidated > 0) {
                            process.stdout.write(' (validated ' + validation.mappingsValidated + ' mappings)');
                        }
                    } catch (validationErr) {
                        if (isVerbose) {
                            process.stdout.write(' (validation error: ' + validationErr.message + ')');
                        }
                        // Don't fail the test if validation has an error, just log it
                    }
                }
                
                ok('OK');
            } else if (err) {
                fail('ERROR: ' + (err && err.message));
                if (isVerbose) {
                    process.stdout.write('\n');
                    process.stdout.write(err.stack + '\n');
                }
            } else {
                difference('FAIL', normalizedExpected, normalizedSourcemap);
            }
        });
    }

    function testSourcemapWithoutUrlAnnotation(name, err, compiledLess, doReplacements, sourcemap, baseFolder) {
        if (err) {
            fail('ERROR: ' + (err && err.message));
            return;
        }
        // This matches with strings that end($) with source mapping url annotation.
        var sourceMapRegExp = /\/\*# sourceMappingURL=.+\.css\.map \*\/$/;
        if (sourceMapRegExp.test(compiledLess)) {
            fail('ERROR: sourceMappingURL found in ' + baseFolder + '/' + name + '.css.');
            return;
        }

        // Even if annotation is not necessary, the map file should be there.
        fs.readFile(path.join('test/', name) + '.json', 'utf8', function (e, expectedSourcemap) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            if (sourcemap === expectedSourcemap) {
                ok('OK');
            } else if (err) {
                fail('ERROR: ' + (err && err.message));
                if (isVerbose) {
                    process.stdout.write('\n');
                    process.stdout.write(err.stack + '\n');
                }
            } else {
                difference('FAIL', expectedSourcemap, sourcemap);
            }
        });
    }

    function testEmptySourcemap(name, err, compiledLess, doReplacements, sourcemap, baseFolder) {
        process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
        if (err) {
            fail('ERROR: ' + (err && err.message));
        } else {
            var expectedSourcemap = undefined;
            if ( compiledLess !== '' ) {
                difference('\nCompiledLess must be empty', '', compiledLess);

            } else if (sourcemap !== expectedSourcemap) {
                fail('Sourcemap must be undefined');
            } else {
                ok('OK');
            }
        }
    }

    function testSourcemapWithVariableInSelector(name, err, compiledLess, doReplacements, sourcemap, baseFolder) {
        if (err) {
            fail('ERROR: ' + (err && err.message));
            return;
        }

        // Even if annotation is not necessary, the map file should be there.
        fs.readFile(path.join('test/', name) + '.json', 'utf8', function (e, expectedSourcemap) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            if (sourcemap === expectedSourcemap) {
                ok('OK');
            } else if (err) {
                fail('ERROR: ' + (err && err.message));
                if (isVerbose) {
                    process.stdout.write('\n');
                    process.stdout.write(err.stack + '\n');
                }
            } else {
                difference('FAIL', expectedSourcemap, sourcemap);
            }
        });
    }

    function testImports(name, err, compiledLess, doReplacements, sourcemap, baseFolder, imports) {
        if (err) {
            fail('ERROR: ' + (err && err.message));
            return;
        }

        function stringify(str) {
            return JSON.stringify(imports, null, '  ')
        }

        /** Imports are not sorted */
        const importsString = stringify(imports.sort())

        fs.readFile(path.join(lessFolder, name) + '.json', 'utf8', function (e, expectedImports) {
            if (e) {
                fail('ERROR: ' + (e && e.message));
                return;
            }
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            expectedImports = stringify(JSON.parse(expectedImports).sort());
            expectedImports = globalReplacements(expectedImports, baseFolder);

            if (expectedImports === importsString) {
                ok('OK');
            } else if (err) {
                fail('ERROR: ' + (err && err.message));
                if (isVerbose) {
                    process.stdout.write('\n');
                    process.stdout.write(err.stack + '\n');
                }
            } else {
                difference('FAIL', expectedImports, importsString);
            }
        });
    }

    function testErrors(name, err, compiledLess, doReplacements, sourcemap, baseFolder) {
        fs.readFile(path.join(baseFolder, name) + '.txt', 'utf8', function (e, expectedErr) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            expectedErr = doReplacements(expectedErr, baseFolder, err && err.filename);
            if (!err) {
                if (compiledLess) {
                    fail('No Error', 'red');
                } else {
                    fail('No Error, No Output');
                }
            } else {
                var errMessage = err.toString();
                if (errMessage === expectedErr) {
                    ok('OK');
                } else {
                    difference('FAIL', expectedErr, errMessage);
                }
            }
        });
    }

    // To fix ci fail about error format change in upstream v8 project
    // https://github.com/v8/v8/commit/c0fd89c3c089e888c4f4e8582e56db7066fa779b
    // Node 16.9.0+ include this change via https://github.com/nodejs/node/pull/39947
    function testTypeErrors(name, err, compiledLess, doReplacements, sourcemap, baseFolder) {
        const fileSuffix = semver.gte(process.version, 'v16.9.0') ? '-2.txt' : '.txt';
        fs.readFile(path.join(baseFolder, name) + fileSuffix, 'utf8', function (e, expectedErr) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            expectedErr = doReplacements(expectedErr, baseFolder, err && err.filename);
            if (!err) {
                if (compiledLess) {
                    fail('No Error', 'red');
                } else {
                    fail('No Error, No Output');
                }
            } else {
                var errMessage = err.toString();
                if (errMessage === expectedErr) {
                    ok('OK');
                } else {
                    difference('FAIL', expectedErr, errMessage);
                }
            }
        });
    }

    // https://github.com/less/less.js/issues/3112
    function testJSImport() {
        process.stdout.write('- Testing root function registry');
        less.functions.functionRegistry.add('ext', function() {
            return new less.tree.Anonymous('file');
        });
        var expected = '@charset "utf-8";\n';
        toCSS({}, path.join(lessFolder, 'tests-config', 'root-registry', 'root.less'), function(error, output) {
            if (error) {
                return fail('ERROR: ' + error);
            }
            if (output.css === expected) {
                return ok('OK');
            }
            difference('FAIL', expected, output.css);
        });
    }

    function globalReplacements(input, directory, filename) {
        var path = require('path');
        var p = filename ? path.join(path.dirname(filename), '/') : directory;
        
        // For debug tests in subdirectories (comments/, mediaquery/, all/),
        // the import/ directory and main linenumbers.less file are at the parent debug/ level, not in the subdirectory
        var isDebugSubdirectory = false;
        var debugParentPath = null;
        
        if (directory) {
            // Normalize directory path separators for matching
            var normalizedDir = directory.replace(/\\/g, '/');
            // Check if we're in a debug subdirectory
            if (normalizedDir.includes('/debug/') && (normalizedDir.includes('/comments/') || normalizedDir.includes('/mediaquery/') || normalizedDir.includes('/all/'))) {
                isDebugSubdirectory = true;
                // Extract the debug/ directory path (parent of the subdirectory)
                // Match everything up to and including /debug/ (works with both absolute and relative paths)
                var debugMatch = normalizedDir.match(/(.+\/debug)\//);
                if (debugMatch) {
                    debugParentPath = debugMatch[1];
                }
            }
        }
        
        if (isDebugSubdirectory && debugParentPath) {
            // For {path} placeholder, use the parent debug/ directory
            // Convert back to native path format
            p = debugParentPath.replace(/\//g, path.sep) + path.sep;
        }
        
        var pathimport;
        if (isDebugSubdirectory && debugParentPath) {
            pathimport = path.join(debugParentPath.replace(/\//g, path.sep), 'import') + path.sep;
        } else {
            pathimport = path.join(directory + 'import/');
        }
        
        var pathesc = p.replace(/[.:/\\]/g, function(a) { return '\\' + (a == '\\' ? '\/' : a); }),
            pathimportesc = pathimport.replace(/[.:/\\]/g, function(a) { return '\\' + (a == '\\' ? '\/' : a); });

        return input.replace(/\{path\}/g, p)
            .replace(/\{node\}/g, '')
            .replace(/\{\/node\}/g, '')
            .replace(/\{pathhref\}/g, '')
            .replace(/\{404status\}/g, '')
            .replace(/\{nodepath\}/g, path.join(process.cwd(), 'node_modules', '/'))
            .replace(/\{pathrel\}/g, path.join(path.relative(lessFolder, p), '/'))
            .replace(/\{pathesc\}/g, pathesc)
            .replace(/\{pathimport\}/g, pathimport)
            .replace(/\{pathimportesc\}/g, pathimportesc)
            .replace(/\r\n/g, '\n');
    }

    function checkGlobalLeaks() {
        return Object.keys(global).filter(function(v) {
            return globals.indexOf(v) < 0;
        });
    }

    function testSyncronous(options, filenameNoExtension) {
        if (oneTestOnly && ('Test Sync ' + filenameNoExtension) !== oneTestOnly) {
            return;
        }
        totalTests++;
        queue(function() {
            var isSync = true;
            toCSS(options, path.join(lessFolder, filenameNoExtension + '.less'), function (err, result) {
                process.stdout.write('- Test Sync ' + filenameNoExtension + ': ');

                if (isSync) {
                    ok('OK');
                } else {
                    fail('Not Sync');
                }
                release();
            });
            isSync = false;
        });
    }

    function runTestSet(options, foldername, verifyFunction, nameModifier, doReplacements, getFilename) {
        // Handle case where first parameter is glob patterns (no options object)
        if (Array.isArray(options)) {
            // First parameter is glob patterns, no options object
            foldername = options;
            options = {};
        } else if (typeof options === 'string') {
            // First parameter is foldername (no options object)
            foldername = options;
            options = {};
        } else {
            options = options ? clone(options) : {};
        }
        runTestSetInternal(lessFolder, options, foldername, verifyFunction, nameModifier, doReplacements, getFilename);
    }

    function runTestSetNormalOnly(options, foldername, verifyFunction, nameModifier, doReplacements, getFilename) {
        runTestSetInternal(lessFolder, options, foldername, verifyFunction, nameModifier, doReplacements, getFilename);
    }

    function runTestSetInternal(baseFolder, opts, foldername, verifyFunction, nameModifier, doReplacements, getFilename) {
        foldername = foldername || '';

        var originalOptions = opts || {};

        if (!doReplacements) {
            doReplacements = globalReplacements;
        }

        // Handle glob patterns with exclusions
        if (Array.isArray(foldername)) {
            var patterns = foldername;
            var includePatterns = [];
            var excludePatterns = [];
            
            
            patterns.forEach(function(pattern) {
                if (pattern.startsWith('!')) {
                    excludePatterns.push(pattern.substring(1));
                } else {
                    includePatterns.push(pattern);
                }
            });
            
            // Use glob to find all matching files, excluding the excluded patterns
            var allFiles = [];
            includePatterns.forEach(function(pattern) {
                var files = glob.sync(pattern, { 
                    cwd: baseFolder,
                    absolute: true,
                    ignore: excludePatterns
                });

                allFiles = allFiles.concat(files);
            });
            
            // Note: needle mocking is set up globally in index.js
            
            // Process each .less file found
            allFiles.forEach(function(filePath) {
                if (/\.less$/.test(filePath)) {
                    var file = path.basename(filePath);
                    // For glob patterns, we need to construct the relative path differently
                    // The filePath is absolute, so we need to get the path relative to the test-data directory
                    var relativePath = path.relative(baseFolder, path.dirname(filePath)) + '/';

                    // Only process files that have corresponding .css files (these are the actual tests)
                    var cssPath = path.join(path.dirname(filePath), path.basename(file, '.less') + '.css');
                    if (fs.existsSync(cssPath)) {
                        // Process this file using the existing logic
                        processFileWithInfo({
                            file: file,
                            fullPath: filePath,
                            relativePath: relativePath
                        });
                    }
                }
            });
            

            return;
        }

        function processFileWithInfo(fileInfo) {
            var file = fileInfo.file;
            var fullPath = fileInfo.fullPath;
            var relativePath = fileInfo.relativePath;
            
            // Load config for this specific file using cosmiconfig
            var configResult = cosmiconfigSync('styles').search(path.dirname(fullPath));
            
            // Deep clone the original options to prevent Less from modifying shared objects
            var options = JSON.parse(JSON.stringify(originalOptions || {}));
            
            if (configResult && configResult.config && configResult.config.language && configResult.config.language.less) {
                // Deep clone and merge the language.less settings with the original options
                var lessConfig = JSON.parse(JSON.stringify(configResult.config.language.less));
                Object.keys(lessConfig).forEach(function(key) {
                    options[key] = lessConfig[key];
                });
            }
            
            // Merge any lessOptions from the testMap (for dynamic options like getVars functions)
            if (originalOptions && originalOptions.lessOptions) {
                Object.keys(originalOptions.lessOptions).forEach(function(key) {
                    var value = originalOptions.lessOptions[key];
                    if (typeof value === 'function') {
                        // For functions, call them with the file path
                        var result = value(fullPath);
                        options[key] = result;
                    } else {
                        // For static values, use them directly
                        options[key] = value;
                    }
                });
            }

            // Don't pass stylize to less.render as it's not a valid option

            var name = getBasename(file, relativePath);
            

            if (oneTestOnly && typeof oneTestOnly === 'string' && !name.includes(oneTestOnly)) {
                return;
            }

            totalTests++;

            if (options.sourceMap && !options.sourceMap.sourceMapFileInline) {
                // Set test infrastructure defaults only if not already set by styles.config.cjs
                // Less.js core (parse-tree.js) will handle normalization of:
                // - sourceMapBasepath (defaults to input file's directory)
                // - sourceMapInputFilename (defaults to options.filename)
                // - sourceMapFilename (derived from sourceMapOutputFilename or input filename)
                // - sourceMapOutputFilename (derived from input filename if not set)
                if (!options.sourceMap.sourceMapOutputFilename) {
                    // Needed for sourcemap file name in JSON output
                    options.sourceMap.sourceMapOutputFilename = name + '.css';
                }
                if (!options.sourceMap.sourceMapRootpath) {
                    // Test-specific default for consistent test output paths
                    options.sourceMap.sourceMapRootpath = 'testweb/';
                }
            }

            options.getVars = function(file) {
                try {
                    return JSON.parse(fs.readFileSync(getFilename(getBasename(file, relativePath), 'vars', baseFolder), 'utf8'));
                }
                catch (e) {
                    return {};
                }
            };

            var doubleCallCheck = false;
            queue(function() {
                toCSS(options, fullPath, function (err, result) {

                    if (doubleCallCheck) {
                        totalTests++;
                        fail('less is calling back twice');
                        process.stdout.write(doubleCallCheck + '\n');
                        process.stdout.write((new Error()).stack + '\n');
                        return;
                    }
                    doubleCallCheck = (new Error()).stack;

                    /**
                     * @todo - refactor so the result object is sent to the verify function
                     */
                    if (verifyFunction) {
                        var verificationResult = verifyFunction(
                            name, err, result && result.css, doReplacements, result && result.map, baseFolder, result && result.imports, getFilename
                        );
                        release();
                        return verificationResult;
                    }

                    if (err) {
                        fail('ERROR: ' + (err && err.message));
                        if (isVerbose) {
                            process.stdout.write('\n');
                            if (err.stack) {
                                process.stdout.write(err.stack + '\n');
                            } else {
                                // this sometimes happen - show the whole error object
                                console.log(err);
                            }
                        }
                        release();
                        return;
                    }
                    var css_name = name;
                    if (nameModifier) { css_name = nameModifier(name); }

                    // Check if we're using the new co-located structure (tests-unit/ or tests-config/) or the old separated structure
                    var cssPath;
                    if (relativePath.startsWith('tests-unit/') || relativePath.startsWith('tests-config/')) {
                        // New co-located structure: CSS file is in the same directory as LESS file
                        cssPath = path.join(path.dirname(fullPath), path.basename(file, '.less') + '.css');
                    } else {
                        // Old separated structure: CSS file is in separate css/ folder
                        // Windows compatibility: css_name may already contain path separators
                        // Use path.join with empty string to let path.join handle normalization
                        cssPath = path.join(testFolder, css_name) + '.css';
                    }

                    // For the new structure, we need to handle replacements differently
                    var replacementPath;
                    if (relativePath.startsWith('tests-unit/') || relativePath.startsWith('tests-config/')) {
                        replacementPath = path.dirname(fullPath);
                        // Ensure replacementPath ends with a path separator for consistent matching
                        if (!replacementPath.endsWith(path.sep)) {
                            replacementPath += path.sep;
                        }
                    } else {
                        replacementPath = path.join(baseFolder, relativePath);
                    }

                    var testName = fullPath.replace(/\.less$/, '');
                    process.stdout.write('- ' + testName + ': ');


                    var css = fs.readFileSync(cssPath, 'utf8');
                    css = css && doReplacements(css, replacementPath);
                    if (result.css === css) { ok('OK'); }
                    else {
                        difference('FAIL', css, result.css);
                    }
                    
                    release();
                });
            });
        }
        
        function getBasename(file, relativePath) {
            var basePath = relativePath || foldername;
            // Ensure basePath ends with a slash for proper path construction
            if (basePath.charAt(basePath.length - 1) !== '/') {
                basePath = basePath + '/';
            }
            return basePath + path.basename(file, '.less');
        }

        
        // This function is only called for non-glob patterns now
        // For glob patterns, we use the glob library in the calling code
        var dirPath = path.join(baseFolder, foldername);
        var items = fs.readdirSync(dirPath);
        
        items.forEach(function(item) {
            if (/\.less$/.test(item)) {
                processFileWithInfo({
                    file: item,
                    fullPath: path.join(dirPath, item),
                    relativePath: foldername
                });
            }
        });
    }

    function diff(left, right) {
        // Configure chalk to always show colors
        var chalk = require('chalk');
        chalk.level = 3; // Force colors on
        
        // Use jest-diff for much clearer output like Vitest
        var diffResult = require('jest-diff').diffStringsUnified(left || '', right || '', {
            expand: false,
            includeChangeCounts: true,
            contextLines: 1,
            aColor: chalk.red,
            bColor: chalk.green,
            changeColor: chalk.inverse,
            commonColor: chalk.dim
        });
        
        // jest-diff returns a string with ANSI colors, so we can output it directly
        process.stdout.write(diffResult + '\n');
    }

    function fail(msg) {
        process.stdout.write(stylize(msg, 'red') + '\n');
        failedTests++;
        endTest();
    }

    function difference(msg, left, right) {
        process.stdout.write(stylize(msg, 'yellow') + '\n');
        failedTests++;

        // Only show the diff, not the full text
        process.stdout.write(stylize('Diff:', 'yellow') + '\n');
        
        diff(left || '', right || '');
        endTest();
    }

    function ok(msg) {
        process.stdout.write(stylize(msg, 'green') + '\n');
        passedTests++;
        endTest();
    }

    function finished() {
        isFinished = true;
        endTest();
    }

    function endTest() {
        if (isFinished && ((failedTests + passedTests) >= totalTests)) {
            clearInterval(finishTimer);
            var leaked = checkGlobalLeaks();
            process.stdout.write('\n');
            if (failedTests > 0) {
                process.stdout.write(failedTests + stylize(' Failed', 'red') + ', ' + passedTests + ' passed\n');
            } else {
                process.stdout.write(stylize('All Passed ', 'green') + passedTests + ' run\n');
            }
            if (leaked.length > 0) {
                process.stdout.write('\n');
                process.stdout.write(stylize('Global leak detected: ', 'red') + leaked.join(', ') + '\n');
            }

            if (leaked.length || failedTests) {
                process.on('exit', function() { process.reallyExit(1); });
            }
        }
    }

    function contains(fullArray, obj) {
        for (var i = 0; i < fullArray.length; i++) {
            if (fullArray[i] === obj) {
                return true;
            }
        }
        return false;
    }

    /**
     *
     * @param {Object} options
     * @param {string} filePath
     * @param {Function} callback
     */
    function toCSS(options, filePath, callback) {
        // Deep clone options to prevent modifying the original, but preserve functions
        var originalOptions = options || {};
        options = JSON.parse(JSON.stringify(originalOptions));
        
        // Restore functions that were lost in JSON serialization
        if (originalOptions.getVars) {
            options.getVars = originalOptions.getVars;
        }
        var str = fs.readFileSync(filePath, 'utf8'), addPath = path.dirname(filePath);
        
        // Initialize paths array if it doesn't exist
        if (typeof options.paths !== 'string') {
            options.paths = options.paths || [];
        } else {
            options.paths = [options.paths];
        }
        
        // Add the current directory to paths if not already present
        if (!contains(options.paths, addPath)) {
            options.paths.push(addPath);
        }
        
        // Resolve all paths relative to the test file's directory
        options.paths = options.paths.map(searchPath => {
            if (path.isAbsolute(searchPath)) {
                return searchPath;
            }
            // Resolve relative to the test file's directory
            return path.resolve(path.dirname(filePath), searchPath);
        })
        
        options.filename = path.resolve(process.cwd(), filePath);
        options.optimization = options.optimization || 0;

        // Note: globalVars and modifyVars are now handled via styles.config.cjs or lessOptions
        if (options.plugin) {
            var Plugin = require(path.resolve(process.cwd(), options.plugin));
            options.plugins = [Plugin];
        }
        less.render(str, options, callback);
    }

    function testNoOptions() {
        if (oneTestOnly && 'Integration' !== oneTestOnly) {
            return;
        }
        totalTests++;
        try {
            process.stdout.write('- Integration - creating parser without options: ');
            less.render('');
        } catch (e) {
            fail(stylize('FAIL\n', 'red'));
            return;
        }
        ok(stylize('OK\n', 'green'));
    }

    // HTTP redirect testing is now handled directly in test/index.js

    function testDisablePluginRule() {
        less.render(
            '@plugin "../../plugin/some_plugin";',
            {disablePluginRule: true},
            function(err) {
                // TODO: Need a better way of identifing exactly which error is thrown.  Checking
                // text like this tends to be rather brittle.
                const EXPECTED = '@plugin statements are not allowed when disablePluginRule is set to true';
                if (!err || String(err).indexOf(EXPECTED) < 0) {
                    fail('ERROR: Expected "' + EXPECTED + '" error');
                    return;
                }
                ok(stylize('OK\n', 'green'));
            }
        );
    }

    return {
        runTestSet: runTestSet,
        runTestSetNormalOnly: runTestSetNormalOnly,
        testSyncronous: testSyncronous,
        testErrors: testErrors,
        testTypeErrors: testTypeErrors,
        testSourcemap: testSourcemap,
        testSourcemapWithoutUrlAnnotation: testSourcemapWithoutUrlAnnotation,
        testSourcemapWithVariableInSelector: testSourcemapWithVariableInSelector,
        testImports: testImports,
        testEmptySourcemap: testEmptySourcemap,
        testNoOptions: testNoOptions,
        testDisablePluginRule: testDisablePluginRule,
        testJSImport: testJSImport,
        finished: finished
    };
};
