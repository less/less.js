import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import less from '../lib/index.js';

const testDataRoot = path.resolve(packageRoot(), '..', 'test-data', 'tests-unit');

const unsupportedForAlpha1 = [
    {
        area: 'Legacy plugin host APIs',
        detail: 'Less @plugin, render-option function plugins, file-manager plugins, and pre/post-processors are wired for future compatibility but are not alpha.1-supported execution paths.'
    },
    {
        area: 'Source maps',
        detail: 'Source-map options and annotations are not alpha-supported yet.'
    },
    {
        area: 'URL rewrite/process-imports compatibility',
        detail: 'Less 4 urlArgs/static URL/processImports behavior is not alpha-supported yet.'
    },
    {
        area: 'Compression/minification parity',
        detail: 'Less 5 alpha.1 focuses on readable compiler output, not Less 4 compressed output identity.'
    },
    {
        area: 'Permissive legacy syntax edge cases',
        detail: 'Removed/deprecated syntax such as dynamic @charset and other permissive parser corners must reject with precise diagnostics.'
    },
    {
        area: 'Browser/Sauce harness',
        detail: 'The browser harness is not an alpha.1 publish gate.'
    }
];

function packageRoot() {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function printUnsupportedInventory() {
    console.log('\nLess 5 alpha.1 unsupported inventory:');
    for (const entry of unsupportedForAlpha1) {
        console.log(`- ${entry.area}: ${entry.detail}`);
    }
}

async function assertFixtureRendersByteIdentical(fixturePath) {
    const sourcePath = path.join(testDataRoot, `${fixturePath}.less`);
    const expectedPath = path.join(testDataRoot, `${fixturePath}.css`);
    const [result, expected] = await Promise.all([
        less.renderFile(sourcePath, { paths: [path.dirname(sourcePath)] }),
        readFile(expectedPath, 'utf8')
    ]);
    assert.equal(result.css, expected, `${fixturePath} should render byte-identically`);
}

async function assertSupportedCompileSurface() {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'less-alpha-support-'));
    try {
        const imported = path.join(tempDir, 'tokens.less');
        const entry = path.join(tempDir, 'entry.less');

        await writeFile(imported, [
            '@accent: blue;',
            '.token() { border-color: @accent; }',
            ''
        ].join('\n'));
        await writeFile(entry, [
            '@import "tokens.less";',
            '@width: 1 + 1;',
            '.box {',
            '  width: @width;',
            '  .token();',
            '  &:hover { color: red; }',
            '}',
            ''
        ].join('\n'));

        const result = await less.renderFile(entry, { collapseNesting: true });
        assert.equal(result.css, `.box {
  width: 2;
  border-color: blue;
}
.box:hover {
  color: red;
}
`);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

async function assertUnsupportedSyntaxHasPreciseDiagnostic() {
    const stderrWrites = [];
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function captureStderr(chunk, ...args) {
        stderrWrites.push(String(chunk));
        if (typeof args.at(-1) === 'function') {
            args.at(-1)();
        }
        return true;
    };
    try {
        await assert.rejects(
            less.render('@Eight: 8;\n@charset "UTF-@{Eight}";\n', {
                filename: 'alpha-unsupported.less'
            }),
            error => {
                assert.equal(error.type, 'parse');
                assert.equal(error.filename, 'alpha-unsupported.less');
                assert.equal(error.line, 2);
                assert.equal(error.column, 1);
                assert.deepEqual(error.extract, [
                    '@Eight: 8;',
                    '@charset "UTF-@{Eight}";',
                    ''
                ]);
                assert.equal(error.jessErrors?.[0]?.code, 'parse/dynamic-charset');
                assert.equal(error.jessErrors?.[0]?.message, error.message);
                assert.equal(String(error), 'Error: Interpolation is not valid in @charset.');
                assert.doesNotMatch(String(error), /offset/i);
                return true;
            }
        );
    } finally {
        process.stderr.write = originalStderrWrite;
    }
    assert.equal(stderrWrites.join(''), '',
        'programmatic less.render() failures must not print diagnostics before the caller handles the rejection');
}

async function assertBareStructuralAtRuleVariablesReject() {
    await assert.rejects(
        less.render('@varfoo: foo;\n@container @varfoo (min-width: 400px) { .x { color: red; } }\n', {
            filename: 'bare-at-rule-var.less'
        }),
        error => {
            assert.equal(error.type, 'parse');
            assert.equal(error.filename, 'bare-at-rule-var.less');
            assert.equal(error.line, 2);
            assert.equal(error.column, 12);
            assert.deepEqual(error.extract, [
                '@varfoo: foo;',
                '@container @varfoo (min-width: 400px) { .x { color: red; } }',
                ''
            ]);
            assert.doesNotMatch(String(error), /offset/i);
            return true;
        }
    );
}

async function assertUnsupportedApiOptionsReject() {
    const unsupported = [
        'sourceMap',
        'globalVars',
        'modifyVars',
        'compress',
        'rewriteUrls',
        'urlArgs',
        'javascriptEnabled',
        'strictUnits',
        'rootpath'
    ];
    for (const option of unsupported) {
        await assert.rejects(
            less.render('.x { color: red; }\n', { [option]: true }),
            error => {
                assert.match(error.message, /not supported/);
                assert.match(error.message, new RegExp(option));
                return true;
            },
            `${option} must reject instead of silently no-oping`
        );
    }
}

await assertSupportedCompileSurface();
await assertUnsupportedSyntaxHasPreciseDiagnostic();
await assertBareStructuralAtRuleVariablesReject();
await assertUnsupportedApiOptionsReject();
await assertFixtureRendersByteIdentical('at-rule-variable-interpolation/at-rule-variable-interpolation');
await assertFixtureRendersByteIdentical('color-functions/modern');
await assertFixtureRendersByteIdentical('math-css-vars/math-css-vars');
await assertFixtureRendersByteIdentical('mixins-guards/mixins-guards');
await assertFixtureRendersByteIdentical('mixins-named-args/mixins-named-args');
printUnsupportedInventory();

console.log('\nLess 5 alpha.1 support contract passed');
