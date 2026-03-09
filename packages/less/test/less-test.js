/* jshint latedef: nofunc */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import semver from 'semver';
import logger from '../lib/less/logger.js';
import { cosmiconfigSync } from 'cosmiconfig';
import { globSync } from 'glob';
import { copy as clone } from 'copy-anything';
import less from '../lib/less-node/index.js';
import { stylize } from '../lib/less-node/lessc-helper.js';

const require = createRequire(import.meta.url);

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


export default function(testFilter) {
    var globals = Object.keys(global);

    var oneTestOnly = testFilter || process.argv[2],
        isFinished = false;

    var testFolder = path.relative(process.cwd(), path.dirname(require.resolve('@less/test-data')));
    var lessFolder = testFolder;

    var queueList = [],
        queueRunning = false;
    function queue(func) {
        if (queueRunning) {
            queueList.push(func);
        } else {
            queueRunning = true;
            func();
        }
    }
    function release() {
        if (queueList.length) {
            var func = queueList.shift();
            setTimeout(func, 0);
        } else {
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
        var SourceMapConsumer = require('source-map').SourceMapConsumer;
        var sourceMapObj = typeof sourcemap === 'string' ? JSON.parse(sourcemap) : sourcemap;
        var consumer = new SourceMapConsumer(sourceMapObj);

        var lessSource = fs.readFileSync(lessFile, 'utf8');
        var lessLines = lessSource.split('\n');

        var cssSource = compiledCSS.replace(/\/\*# sourceMappingURL=.*\*\/\s*$/, '').trim();
        var cssLines = cssSource.split('\n');

        var errors = [];
        var validatedMappings = 0;

        for (var cssLine = 1; cssLine <= cssLines.length; cssLine++) {
            var cssLineContent = cssLines[cssLine - 1];
            if (!cssLineContent.trim()) {
                continue;
            }

            var mapping = consumer.originalPositionFor({
                line: cssLine,
                column: 0
            });

            if (mapping.source) {
                validatedMappings++;

                if (!sourceMapObj.sources || sourceMapObj.sources.indexOf(mapping.source) === -1) {
                    errors.push('Line ' + cssLine + ': mapped to source "' + mapping.source + '" which is not in sources array');
                }

                if (mapping.line && mapping.line > 0) {
                    var sourceIndex = sourceMapObj.sources.indexOf(mapping.source);
                    if (sourceIndex >= 0 && sourceMapObj.sourcesContent && sourceMapObj.sourcesContent[sourceIndex] !== undefined && sourceMapObj.sourcesContent[sourceIndex] !== null) {
                        var sourceContent = sourceMapObj.sourcesContent[sourceIndex];
                        if (typeof sourceContent !== 'string') {
                            sourceContent = String(sourceContent);
                        }
                        var sourceLines = sourceContent.split(/\r?\n/);
                        if (mapping.line > sourceLines.length) {
                            errors.push('Line ' + cssLine + ': mapped to line ' + mapping.line + ' in "' + mapping.source + '" but source only has ' + sourceLines.length + ' lines');
                        }
                    }
                }
            }
        }

        if (sourceMapObj.sources) {
            sourceMapObj.sources.forEach(function(source, index) {
                if (sourceMapObj.sourcesContent && sourceMapObj.sourcesContent[index]) {
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

    function testSourcemap(name, err, compiledLess, doReplacements, sourcemap, baseFolder, imports, getFilename) {
        if (err) {
            fail('ERROR: ' + (err && err.message));
            return;
        }
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

        if (!actualSourceMapURL) {
            fail('ERROR: sourceMappingURL is empty in ' + baseFolder + '/' + name + '.css.');
            return;
        }

        var jsonPath;
        if (getFilename && typeof getFilename === 'function') {
            jsonPath = getFilename(name, 'sourcemap', baseFolder);
        } else {
            var jsonFilename = path.basename(name);
            jsonPath = path.join('test/sourcemaps', jsonFilename) + '.json';
        }
        fs.readFile(jsonPath, 'utf8', function (e, expectedSourcemap) {
            process.stdout.write('- ' + path.join(baseFolder, name) + ': ');
            if (e) {
                fail('ERROR: Could not read expected sourcemap file: ' + jsonPath + ' - ' + e.message);
                return;
            }

            var replacementPath = path.join(path.dirname(path.join(baseFolder, name) + '.less'), '/');
            replacementPath = replacementPath.replace(/\\/g, '/');
            expectedSourcemap = expectedSourcemap.replace(/\{path\}/g, replacementPath);
            expectedSourcemap = doReplacements(expectedSourcemap, baseFolder, path.join(baseFolder, name) + '.less');

            function normalizeSourcemapPaths(sm) {
                try {
                    var parsed = typeof sm === 'string' ? JSON.parse(sm) : sm;
                    if (parsed.file) {
                        parsed.file = parsed.file.replace(/\\/g, '/');
                    }
                    if (parsed.sources && Array.isArray(parsed.sources)) {
                        parsed.sources = parsed.sources.map(function(src) {
                            return src.replace(/\\/g, '/');
                        });
                    }
                    return JSON.stringify(parsed, null, 0);
                } catch (parseErr) {
                    return sm;
                }
            }

            var normalizedSourcemap = normalizeSourcemapPaths(sourcemap);
            var normalizedExpected = normalizeSourcemapPaths(expectedSourcemap);

            if (normalizedSourcemap === normalizedExpected) {
                var nameParts = name.split('/');
                var lessFileName = nameParts[nameParts.length - 1];
                var lessFileDir = nameParts.length > 1 ? nameParts.slice(0, -1).join('/') : '';
                var lessFile = path.join(lessFolder, lessFileDir, lessFileName) + '.less';

                if (fs.existsSync(lessFile)) {
                    try {
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
        var sourceMapRegExp = /\/\*# sourceMappingURL=.+\.css\.map \*\/$/;
        if (sourceMapRegExp.test(compiledLess)) {
            fail('ERROR: sourceMappingURL found in ' + baseFolder + '/' + name + '.css.');
            return;
        }

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
        var p = filename ? path.join(path.dirname(filename), '/') : directory;

        var isDebugSubdirectory = false;
        var debugParentPath = null;

        if (directory) {
            var normalizedDir = directory.replace(/\\/g, '/');
            if (normalizedDir.includes('/debug/') && (normalizedDir.includes('/comments/') || normalizedDir.includes('/mediaquery/') || normalizedDir.includes('/all/'))) {
                isDebugSubdirectory = true;
                var debugMatch = normalizedDir.match(/(.+\/debug)\//);
                if (debugMatch) {
                    debugParentPath = debugMatch[1];
                }
            }
        }

        if (isDebugSubdirectory && debugParentPath) {
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
        if (Array.isArray(options)) {
            foldername = options;
            options = {};
        } else if (typeof options === 'string') {
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

            var allFiles = [];
            includePatterns.forEach(function(pattern) {
                var files = globSync(pattern, {
                    cwd: baseFolder,
                    absolute: true,
                    ignore: excludePatterns
                });

                allFiles = allFiles.concat(files);
            });

            allFiles.forEach(function(filePath) {
                if (/\.less$/.test(filePath)) {
                    var file = path.basename(filePath);
                    var relativePath = path.relative(baseFolder, path.dirname(filePath)) + '/';

                    var cssPath = path.join(path.dirname(filePath), path.basename(file, '.less') + '.css');
                    if (fs.existsSync(cssPath)) {
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

            var configResult = cosmiconfigSync('styles').search(path.dirname(fullPath));

            var options = JSON.parse(JSON.stringify(originalOptions || {}));

            if (configResult && configResult.config && configResult.config.language && configResult.config.language.less) {
                var lessConfig = JSON.parse(JSON.stringify(configResult.config.language.less));
                Object.keys(lessConfig).forEach(function(key) {
                    options[key] = lessConfig[key];
                });
            }

            if (originalOptions && originalOptions.lessOptions) {
                Object.keys(originalOptions.lessOptions).forEach(function(key) {
                    var value = originalOptions.lessOptions[key];
                    if (typeof value === 'function') {
                        var result = value(fullPath);
                        options[key] = result;
                    } else {
                        options[key] = value;
                    }
                });
            }

            var name = getBasename(file, relativePath);

            if (oneTestOnly && typeof oneTestOnly === 'string' && !name.includes(oneTestOnly)) {
                return;
            }

            totalTests++;

            if (options.sourceMap && typeof options.sourceMap === 'object') {
                if (!options.sourceMap.sourceMapFileInline) {
                    if (!options.sourceMap.sourceMapOutputFilename) {
                        options.sourceMap.sourceMapOutputFilename = name + '.css';
                    }
                    if (!options.sourceMap.sourceMapRootpath) {
                        options.sourceMap.sourceMapRootpath = 'testweb/';
                    }
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
                                console.log(err);
                            }
                        }
                        release();
                        return;
                    }
                    var css_name = name;
                    if (nameModifier) { css_name = nameModifier(name); }

                    var cssPath;
                    if (relativePath.startsWith('tests-unit/') || relativePath.startsWith('tests-config/')) {
                        cssPath = path.join(path.dirname(fullPath), path.basename(file, '.less') + '.css');
                    } else {
                        cssPath = path.join(testFolder, css_name) + '.css';
                    }

                    var replacementPath;
                    if (relativePath.startsWith('tests-unit/') || relativePath.startsWith('tests-config/')) {
                        replacementPath = path.dirname(fullPath);
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
            if (basePath.charAt(basePath.length - 1) !== '/') {
                basePath = basePath + '/';
            }
            return basePath + path.basename(file, '.less');
        }

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
        var chalk = require('chalk');
        chalk.level = 3;

        var diffResult = require('jest-diff').diffStringsUnified(left || '', right || '', {
            expand: false,
            includeChangeCounts: true,
            contextLines: 1,
            aColor: chalk.red,
            bColor: chalk.green,
            changeColor: chalk.inverse,
            commonColor: chalk.dim
        });

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

    function toCSS(options, filePath, callback) {
        var originalOptions = options || {};
        options = JSON.parse(JSON.stringify(originalOptions));

        if (originalOptions.getVars) {
            options.getVars = originalOptions.getVars;
        }
        var str = fs.readFileSync(filePath, 'utf8'), addPath = path.dirname(filePath);

        if (typeof options.paths !== 'string') {
            options.paths = options.paths || [];
        } else {
            options.paths = [options.paths];
        }

        if (!contains(options.paths, addPath)) {
            options.paths.push(addPath);
        }

        options.paths = options.paths.map(searchPath => {
            if (path.isAbsolute(searchPath)) {
                return searchPath;
            }
            return path.resolve(path.dirname(filePath), searchPath);
        })

        options.filename = path.resolve(process.cwd(), filePath);
        options.optimization = options.optimization || 0;

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

    function testDisablePluginRule() {
        less.render(
            '@plugin "../../plugin/some_plugin";',
            {disablePluginRule: true},
            function(err) {
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
