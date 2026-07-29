import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { globSync } from 'glob';

import less from '../lib/index.js';

const require = createRequire(import.meta.url);
const testDataRoot = path.dirname(require.resolve('@less/test-data'));

function readFixtureFilters(argv) {
    const filters = [];
    for (let index = 2; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--fixture') {
            const value = argv[index + 1];
            if (!value) {
                throw new Error('--fixture requires a fixture path');
            }
            filters.push(value);
            index += 1;
            continue;
        }
        if (arg.startsWith('--fixture=')) {
            const value = arg.slice('--fixture='.length);
            if (!value) {
                throw new Error('--fixture requires a fixture path');
            }
            filters.push(value);
        }
    }
    return filters;
}

const fixtureFilters = readFixtureFilters(process.argv);

function fixtureMatches(file) {
    if (fixtureFilters.length === 0) {
        return true;
    }
    return fixtureFilters.some(filter =>
        file === filter || file.includes(filter)
    );
}

const fixtureFunctionPlugin = {
    install(pluginLess, _manager, functions) {
        functions.addMultiple({
            add(a, b) {
                return readNumericFunctionArg(a) + readNumericFunctionArg(b);
            },
            increment(a) {
                return readNumericFunctionArg(a) + 1;
            },
            _color(str) {
                if (readStringFunctionArg(str) === 'evil red') {
                    return '#660000';
                }
                return undefined;
            }
        });
    }
};

const skippedFixtures = new Map([
    ['tests-config/3rd-party/bootstrap4.less', 'broad third-party fixture; keep out of config smoke progression'],
    ['tests-config/at-rules-compressed/at-rules-compressed.less', 'compression output parity not yet alpha-gated'],
    ['tests-config/at-rules-compressed-evaluation/at-rules-compressed-evaluation.less', 'compression output parity not yet alpha-gated'],
    ['tests-config/compression/compression.less', 'compression output parity not yet alpha-gated'],
    ['tests-config/debug/linenumbers.less', 'debug output fixture; no expected CSS in upstream fixture'],
    ['tests-config/filemanagerPlugin/filemanager.less', 'custom Less file manager plugin API needs scope decision'],
    ['tests-config/globalVars/extended.less', 'globalVars injection is not alpha-supported'],
    ['tests-config/globalVars/simple.less', 'globalVars injection is not alpha-supported'],
    ['tests-config/include-path/include-path.less', 'data-uri() and image-size() file helpers are not alpha-supported'],
    ['tests-config/include-path-string/include-path-string.less', 'data-uri() file helper is not alpha-supported'],
    ['tests-config/include-path/import-test-e.less', 'helper imported by include-path fixture; no expected CSS'],
    ['tests-config/import-redirect/import-redirect.less', 'no expected CSS in upstream fixture'],
    ['tests-config/js-type-errors/js-type-error.less', 'expected error fixture, not render-to-CSS fixture'],
    ['tests-config/math-always/mixins-guards.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-always/no-sm-operations.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-parens-division/media-math.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-parens-division/mixins-args.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-parens-division/new-division.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-parens-division/parens.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-strict/css.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-strict/media-math.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-strict/mixins-args.less', 'no expected CSS in upstream fixture'],
    ['tests-config/math-strict/parens.less', 'no expected CSS in upstream fixture'],
    ['tests-config/modifyVars/extended.less', 'modifyVars injection is not alpha-supported'],
    ['tests-config/no-js-errors/no-js-errors.less', 'expected error fixture, not render-to-CSS fixture'],
    ['tests-config/postProcessorPlugin/postProcessor.less', 'Less postprocessor plugin API needs scope decision'],
    ['tests-config/preProcessorPlugin/preProcessor.less', 'Less preprocessor plugin API needs scope decision'],
    ['tests-config/process-imports/google.less', 'processImports URL import removal is not alpha-supported'],
    ['tests-config/rewrite-urls-all/rewrite-urls-all.less', 'URL rewriting is not alpha-supported'],
    ['tests-config/rewrite-urls-local/rewrite-urls-local.less', 'URL rewriting is not alpha-supported'],
    ['tests-config/root-registry/file.less', 'no expected CSS in upstream fixture'],
    ['tests-config/root-registry/root.less', 'no expected CSS in upstream fixture'],
    ['tests-config/rootpath-rewrite-urls-all/rootpath-rewrite-urls-all.less', 'URL rootpath rewriting is not alpha-supported'],
    ['tests-config/rootpath-rewrite-urls-local/rootpath-rewrite-urls-local.less', 'URL rootpath rewriting is not alpha-supported'],
    ['tests-config/strict-imports/imported.less', 'helper imported by strict-imports fixture; no expected CSS'],
    ['tests-config/sourcemaps/basic.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps/custom-props.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps-disable-annotation/basic.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps-empty/empty.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps-empty/var-defs.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps-variable-selector/basic.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/sourcemaps-variable-selector/vars.less', 'source-map output suite needs dedicated output artifact checks'],
    ['tests-config/visitorPlugin/visitor.less', 'Less visitor plugin API needs scope decision'],
    ['tests-unit/import/import-remote.less', 'remote URL imports require an explicit network/IO allowlist']
]);
const selectedSkippedCount = [...skippedFixtures.keys()].filter(fixtureMatches).length;

const expectedFailureFixtures = new Map([
    ['tests-unit/import/import-reference.less', 'reference import filtering leaves extra at-rules'],
    ['tests-unit/import/import.less', '@plugin executes; remaining gap is @import media-query handling and @media query merging'],
    ['tests-unit/urls/urls.less', 'renders but CSS @import placement and multiline function formatting differ from Less'],
    ['tests-config/static-urls/urls.less', 'relativeUrls=false/rootpath static URL behavior is not implemented'],
    ['tests-config/url-args/urls.less', 'urlArgs URL query appending is not implemented'],
    ['tests-config/sourcemaps-basepath/sourcemaps-basepath.less', 'source-map annotation and artifact output need a dedicated harness'],
    ['tests-config/sourcemaps-include-source/sourcemaps-include-source.less', 'source-map annotation and artifact output need a dedicated harness'],
    ['tests-config/sourcemaps-rootpath/sourcemaps-rootpath.less', 'source-map annotation and artifact output need a dedicated harness'],
    ['tests-config/sourcemaps-url/sourcemaps-url.less', 'source-map annotation and artifact output need a dedicated harness'],
    ['tests-unit/detached-rulesets/detached-rulesets.less', 'detached ruleset argument closure matches Less; nested @media query merging still differs'],
    ['tests-unit/extract-and-length/extract-and-length.less', 'current published Jess dependency still has list argument evaluation gaps'],
    ['tests-unit/mixins/mixins.less', 'same-named nested ruleset resolves the outer .recursion() mixin; remaining mismatch is fixture-local collapseNesting=false rendering'],
    ['tests-unit/property-name-interp/property-name-interp.less', 'deprecated dash-only @- and @{-} variable names are rejected'],
    ['tests-unit/plugin-module/plugin-module.less', 'legacy CommonJS @plugin graph with require() is not supported by the optional JS runtime'],
    ['tests-unit/plugin-preeval/plugin-preeval.less', 'legacy tree visitor ABI is not supported'],
    ['tests-unit/plugin/plugin.less', '@plugin scripts execute; remaining gap is nested @media query merging'],
    ['tests-unit/parse-interpolation/parse-interpolation.less', 'renders but interpolation formatting differs from Less'],
    ['tests-unit/parser-slashed-combinator/parser-slashed-combinator.less', 'slashed combinator not yet supported'],
    ['tests-unit/permissive-parse/permissive-parse.less', 'permissive legacy parser corners are not alpha-supported'],
    ['tests-unit/media/media.less', 'top-level bare @var at-rule preludes are rejected'],
    ['tests-unit/at-rule-variable-deprecated/at-rule-variable-deprecated.less', 'bare @variable references in at-rule structural positions are rejected in Less 5 alpha'],
    ['tests-unit/color-functions/operations.less', 'Jess keeps un-operated overflowing rgba() calls authored instead of Less 4 channel clamping'],
    ['tests-unit/functions/functions.less', 'Jess keeps un-operated hsl() calls authored instead of Less 4 clamp/canonicalization']
]);

const expectedFailureDiagnosticCodes = new Map([
    ['tests-unit/import/import.less', 'plugin/load-failed']
]);

const expectedErrorPasses = new Map([
    ['tests-error/eval/add-mixed-units.less', 'unit compatibility errors are not emitted yet'],
    ['tests-error/eval/add-mixed-units2.less', 'unit compatibility errors are not emitted yet'],
    ['tests-error/eval/color-func-invalid-color-2.less', 'color function argument errors are not emitted yet'],
    ['tests-error/eval/color-func-invalid-color.less', 'color function argument errors are not emitted yet'],
    ['tests-error/eval/divide-mixed-units.less', 'unit compatibility errors are not emitted yet'],
    ['tests-error/eval/multiply-mixed-units.less', 'unit compatibility errors are not emitted yet'],
    ['tests-error/eval/percentage-css-var.less', 'function argument type errors are not emitted yet'],
    ['tests-error/eval/percentage-non-number-argument.less', 'function argument type errors are not emitted yet'],
    ['tests-error/eval/svg-gradient1.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/svg-gradient2.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/svg-gradient3.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/svg-gradient4.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/svg-gradient5.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/svg-gradient6.less', 'svg-gradient argument validation errors are not emitted yet'],
    ['tests-error/eval/unit-function.less', 'unit() argument validation errors are not emitted yet']
]);

const expectedMissingWarnings = new Map([
    ['tests-warnings/parentless-ampersand-nested.less', 'parentless ampersand warning is not emitted yet'],
    ['tests-warnings/parentless-ampersand.less', 'parentless ampersand warning is not emitted yet']
]);

const files = globSync('{tests-unit/*/*.less,tests-config/*/*.less}', {
    cwd: testDataRoot,
    nodir: true,
    posix: true
})
    .filter(fixtureMatches)
    .filter(file => !skippedFixtures.has(file))
    .filter(file => !file.startsWith('tests-unit/plugin-'))
    .sort();

let passed = 0;
let expectedFailed = 0;
let errored = 0;
let expectedErrorPassed = 0;
let warned = 0;
let expectedWarningMissing = 0;
const failures = [];

const FIXTURE_TIMEOUT_MS = 15000;

class FixtureTimeoutError extends Error {
    constructor(label, timeoutMs) {
        super(`${label} timed out after ${timeoutMs}ms`);
        this.name = 'FixtureTimeoutError';
    }
}

function isFixtureTimeout(error) {
    return error instanceof FixtureTimeoutError;
}

async function withFixtureTimeout(label, work, timeoutMs = FIXTURE_TIMEOUT_MS) {
    let timer;
    try {
        return await Promise.race([
            work(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new FixtureTimeoutError(label, timeoutMs));
                }, timeoutMs);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}

for (const file of files) {
    const fixturePath = path.join(testDataRoot, file);
    const expectedFailureReason = expectedFailureFixtures.get(file);
    const expectedDiagnosticCode = expectedFailureDiagnosticCodes.get(file);
    const testCases = await getTestCases(fixturePath);

    for (const testCase of testCases) {
        try {
            if (expectedDiagnosticCode) {
                await assertExpectedFailureDiagnostic(testCase, expectedDiagnosticCode);
                expectedFailed += 1;
                continue;
            } else {
                await assertFixtureRenders(testCase);
            }
            if (expectedFailureReason) {
                failures.push(`${testCase.label} passed unexpectedly; remove or reclassify expected failure: ${expectedFailureReason}`);
            } else {
                passed += 1;
            }
        } catch (error) {
            if (isFixtureTimeout(error)) {
                failures.push(`${testCase.label}\n${formatError(error)}`);
                continue;
            }
            if (expectedFailureReason) {
                expectedFailed += 1;
                continue;
            }
            failures.push(`${testCase.label}\n${formatError(error)}`);
        }
    }
}

const errorFiles = globSync('tests-error/{eval,parse}/*.less', {
    cwd: testDataRoot,
    nodir: true,
    posix: true
})
    .filter(fixtureMatches)
    .sort();

for (const file of errorFiles) {
    const fixturePath = path.join(testDataRoot, file);
    try {
        await withFixtureTimeout(file, () => less.renderFile(fixturePath, { collapseNesting: true }));
        const expectedReason = expectedErrorPasses.get(file);
        if (expectedReason) {
            expectedErrorPassed += 1;
        } else {
            failures.push(`${file} rendered unexpectedly; expected a friendly diagnostic`);
        }
    } catch (error) {
        if (expectedErrorPasses.has(file)) {
            failures.push(`${file} now rejects; remove expected error gap: ${expectedErrorPasses.get(file)}`);
            continue;
        }
        try {
            assertForwardedJessDiagnostic(error);
            errored += 1;
        } catch (assertionError) {
            failures.push(`${file}\n${formatError(assertionError)}`);
        }
    }
}

const warningFiles = globSync('tests-warnings/*.less', {
    cwd: testDataRoot,
    nodir: true,
    posix: true
})
    .filter(fixtureMatches)
    .sort();

if (fixtureFilters.length > 0 && files.length === 0 && errorFiles.length === 0 && warningFiles.length === 0 && selectedSkippedCount === 0) {
    throw new Error(`No alpha fixtures matched: ${fixtureFilters.join(', ')}`);
}

for (const file of warningFiles) {
    const fixturePath = path.join(testDataRoot, file);
    try {
        const result = await withFixtureTimeout(file, () => less.renderFile(fixturePath, { collapseNesting: true }));
        const warnings = Array.isArray(result.warnings) ? result.warnings : [];
        if (warnings.length > 0) {
            if (expectedMissingWarnings.has(file)) {
                failures.push(`${file} now emits warnings; remove expected warning gap: ${expectedMissingWarnings.get(file)}`);
            } else {
                warned += 1;
            }
            continue;
        }
        if (expectedMissingWarnings.has(file)) {
            expectedWarningMissing += 1;
        } else {
            failures.push(`${file} rendered without warnings`);
        }
    } catch (error) {
        failures.push(`${file} rejected while checking warnings\n${formatError(error)}`);
    }
}

if (failures.length > 0) {
    console.error(`Less alpha fixture gate failed (${failures.length}):\n`);
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exitCode = 1;
} else {
    console.log(`Less alpha fixtures passed: ${passed} rendered, ${expectedFailed} expected render failures, ${errored} friendly errors, ${expectedErrorPassed} expected missing errors, ${warned} warnings, ${expectedWarningMissing} expected missing warnings, ${selectedSkippedCount} skipped.`);
}

async function assertFixtureRenders(testCase) {
    const expected = readFileSync(testCase.expectedFile, 'utf8');
    const result = await withFixtureTimeout(testCase.label, () => less.renderFile(testCase.lessFile, testCase.options));
    assert.equal(result.css, expected, `${testCase.label} should render byte-identically`);
}

async function assertExpectedFailureDiagnostic(testCase, expectedCode) {
    try {
        await withFixtureTimeout(testCase.label, () => less.renderFile(testCase.lessFile, testCase.options));
    } catch (error) {
        if (isFixtureTimeout(error)) {
            throw error;
        }
        assert.ok(
            error?.jessErrors?.some?.(diagnostic => diagnostic?.code === expectedCode),
            `${testCase.label} should surface Jess diagnostic ${expectedCode}; got ${error?.jessErrors?.map?.(diagnostic => diagnostic?.code).join(', ') || 'none'}`
        );
        return;
    }
    assert.fail(`${testCase.label} rendered successfully instead of surfacing Jess diagnostic ${expectedCode}`);
}

async function getTestCases(lessFile) {
    const relative = path.relative(testDataRoot, lessFile).replace(/\\/g, '/');
    const config = await loadFixtureConfig(path.dirname(lessFile));
    const outputs = outputEntries(config.output);
    const baseName = path.basename(lessFile, '.less');
    const cases = [];

    for (const output of outputs) {
        const outputName = (output.file || '{name}.css').replace(/\{name\}/g, baseName);
        const expectedFile = path.join(path.dirname(lessFile), outputName);
        if (!existsSync(expectedFile)) {
            if (output.file) {
                throw new Error(`Expected output file does not exist: ${expectedFile}`);
            }
            continue;
        }
        cases.push({
            label: output.file ? `${relative} (${outputName})` : relative,
            lessFile,
            expectedFile,
            options: renderOptions(config.lessOptions, output)
        });
    }

    if (cases.length === 0) {
        const fallback = path.join(path.dirname(lessFile), `${baseName}.css`);
        if (!existsSync(fallback)) {
            throw new Error(`No expected output CSS found for ${lessFile}`);
        }
        cases.push({
            label: relative,
            lessFile,
            expectedFile: fallback,
            options: renderOptions(config.lessOptions, { collapseNesting: true })
        });
    }

    return cases;
}

function renderOptions(lessOptions, output) {
    const options = {
        ...lessOptions,
        filename: undefined,
        plugins: [fixtureFunctionPlugin, ...(lessOptions.plugins || [])]
    };
    if (Object.prototype.hasOwnProperty.call(output, 'collapseNesting')) {
        options.collapseNesting = output.collapseNesting === true;
    }
    return options;
}

function outputEntries(output) {
    const defaultOutput = { collapseNesting: true };
    if (!output || typeof output !== 'object') {
        return [defaultOutput];
    }
    if (!Array.isArray(output)) {
        return [{ ...defaultOutput, ...output }];
    }
    let defaults = defaultOutput;
    const entries = [];
    for (const entry of output) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }
        if (!Object.prototype.hasOwnProperty.call(entry, 'file')) {
            defaults = { ...defaults, ...entry };
            continue;
        }
        entries.push({ ...defaults, ...entry });
    }
    return entries.length > 0 ? entries : [defaults];
}

async function loadFixtureConfig(startDir) {
    const configs = [];
    let dir = startDir;
    while (dir.startsWith(testDataRoot)) {
        const configPath = ['styles.config.cjs', 'styles.config.js', 'styles.config.ts']
            .map(name => path.join(dir, name))
            .find(existsSync);
        if (configPath) {
            configs.push(await readConfig(configPath));
        }
        if (dir === testDataRoot) {
            break;
        }
        dir = path.dirname(dir);
    }

    return configs.reverse().reduce(
        (merged, config) => ({
            lessOptions: { ...merged.lessOptions, ...toLessOptions(config) },
            output: Object.prototype.hasOwnProperty.call(config, 'output') ? config.output : merged.output
        }),
        { lessOptions: {}, output: { collapseNesting: true } }
    );
}

async function readConfig(configPath) {
    if (configPath.endsWith('.cjs')) {
        return require(configPath);
    }
    if (configPath.endsWith('.js')) {
        const mod = await import(pathToFileURL(configPath).href);
        return mod.default || mod;
    }
    return readTsConfig(configPath);
}

function readTsConfig(configPath) {
    const source = readFileSync(configPath, 'utf8');
    const outputEntries = [...source.matchAll(/\{\s*file:\s*'([^']+)'\s*,\s*collapseNesting:\s*(true|false)\s*\}/g)]
        .map(match => ({ file: match[1], collapseNesting: match[2] === 'true' }));
    const collapseMatch = /output:\s*\{[\s\S]*?collapseNesting:\s*(true|false)/.exec(source);
    const mathMatch = /mathMode:\s*'([^']+)'/.exec(source);
    const config = {};
    if (outputEntries.length > 0) {
        config.output = outputEntries;
    } else if (collapseMatch) {
        config.output = { collapseNesting: collapseMatch[1] === 'true' };
    }
    if (mathMatch) {
        config.compile = { mathMode: mathMatch[1] };
    }
    return config;
}

function toLessOptions(config) {
    const lessOptions = { ...(config.language?.less || {}) };
    delete lessOptions.javascriptEnabled;
    delete lessOptions.relativeUrls;
    delete lessOptions.silent;
    if (Array.isArray(lessOptions.paths)) {
        lessOptions.paths = lessOptions.paths.map(value => path.resolve(testDataRoot, value));
    }
    const mathMode = config.compile?.mathMode;
    if (mathMode) {
        lessOptions.math = mathMode;
    }
    return lessOptions;
}

function readNumericFunctionArg(value) {
    if (typeof value?.value === 'number') {
        return value.value;
    }
    if (typeof value?.value?.number === 'number') {
        return value.value.number;
    }
    const primitive = value?.valueOf?.() ?? value;
    return Number(primitive);
}

function readStringFunctionArg(value) {
    if (typeof value?.value === 'string') {
        return value.value.replace(/^(['"])(.*)\1$/, '$2');
    }
    if (typeof value?.value?.value === 'string') {
        return value.value.value.replace(/^(['"])(.*)\1$/, '$2');
    }
    const primitive = value?.valueOf?.() ?? value;
    return String(primitive).replace(/^(['"])(.*)\1$/, '$2');
}

function assertForwardedJessDiagnostic(error) {
    assert.equal(typeof error?.message, 'string', 'diagnostic should expose a message');
    assert.equal(typeof error?.type, 'string', 'diagnostic should expose a type');
    assert.equal(typeof error?.filename, 'string', 'diagnostic should preserve filename');
    assert.ok(error.filename.startsWith(testDataRoot), 'diagnostic filename should stay inside the fixture corpus');
    assert.equal(typeof error?.line, 'number', 'diagnostic should expose a line');
    assert.equal(typeof error?.column, 'number', 'diagnostic should expose a column');
    assert.ok(Array.isArray(error?.jessErrors), 'diagnostic should expose Jess diagnostics');
    assert.ok(error.jessErrors.length > 0, 'diagnostic should include at least one Jess error');
    assert.equal(Object.prototype.hasOwnProperty.call(error, 'offset'), false, 'diagnostic should not leak raw offsets');

    const diagnostic = error.jessErrors[0];
    assert.equal(typeof diagnostic?.code, 'string', 'Jess diagnostic should preserve code');
    assert.equal(typeof diagnostic?.phase, 'string', 'Jess diagnostic should preserve phase');
    assert.equal(typeof diagnostic?.message, 'string', 'Jess diagnostic should preserve message');
    assert.equal(typeof diagnostic?.reason, 'string', 'Jess diagnostic should preserve reason');
    assert.equal(typeof diagnostic?.fix, 'string', 'Jess diagnostic should preserve fix');
    if (diagnostic?.filePath !== undefined) {
        assert.equal(diagnostic.filePath, error.filename, 'Jess diagnostic should preserve filePath');
    }
    if (diagnostic?.line !== undefined && diagnostic.line > 0) {
        assert.equal(diagnostic.line, error.line, 'Jess diagnostic should preserve line');
    }
    if (diagnostic?.column !== undefined && diagnostic.column > 0) {
        assert.equal(diagnostic.column, error.column, 'Jess diagnostic should preserve column');
    }
    if (diagnostic?.lines !== undefined) {
        assert.equal(typeof diagnostic.lines, 'object', 'Jess diagnostic should preserve source lines for Linecraft frames');
    }
}

function formatError(error) {
    if (error && typeof error === 'object' && 'stack' in error && typeof error.stack === 'string') {
        return error.stack;
    }
    return String(error);
}
