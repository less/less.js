import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import less from '../lib/index.js';
import { createLessOptions } from '../lib/options.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessc = path.join(packageRoot, 'bin', 'lessc');
const ESC = String.fromCharCode(0x1B);
const BEL = String.fromCharCode(0x07);

function runLessc(args, input = '') {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [lessc, ...args], {
            cwd: packageRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => resolve({ code, stdout, stderr }));
        child.stdin.end(input);
    });
}

function stripTerminalFormatting(value) {
    const osc8Link = new RegExp(`${ESC}\\]8;;[^${ESC}]*(?:${ESC}\\\\|${BEL})`, 'gu');
    const terminalCode = new RegExp(`${ESC}\\[[0-?]*[ -/]*[@-~]`, 'gu');
    return value
        .replace(osc8Link, '')
        .replace(terminalCode, '');
}

function assertNoUiControlSequences(value, label) {
    assert.doesNotMatch(value, new RegExp(`${ESC}\\[\\?\\d+[hl]`, 'u'),
        `${label} must not use alternate-screen or private terminal mode controls`);
    assert.doesNotMatch(value, new RegExp(`${ESC}\\]9;`, 'u'),
        `${label} must not use OSC live-region controls`);
}

const compilerEntrypoint = fileURLToPath(import.meta.resolve('@jesscss/compiler'));
assert.match(compilerEntrypoint, /[/\\]@jesscss[/\\]compiler[/\\]lib[/\\]index\.js$/,
    'the Less CLI must resolve the built generic Jess compiler entrypoint');
await realpath(compilerEntrypoint);

{
    // `output` is a single file-less array entry carrying the projection/
    // serialization options (collapseNesting, compress, sourceMap) so a render
    // option overrides a file-local config; `{}` when the caller set none.
    assert.deepEqual(createLessOptions({}).configOptions.output, {});
    assert.deepEqual(
        createLessOptions({ collapseNesting: true }).configOptions.output,
        [{ collapseNesting: true }]
    );
    // The enum passes through unchanged (true stays the deprecated alias).
    for (const mode of [false, 'native', 'compact']) {
        assert.deepEqual(
            createLessOptions({ collapseNesting: mode }).configOptions.output,
            [{ collapseNesting: mode }],
            `collapseNesting: ${JSON.stringify(mode)} passes through`
        );
    }
    assert.throws(
        () => createLessOptions({ collapseNesting: 'flatten' }),
        /collapseNesting must be false, 'native', 'compact', or true/,
        'an unknown collapseNesting value is rejected'
    );
    // An explicit `undefined` (spread/forwarded options) is treated as omitted,
    // not validated — it must default to nested, never throw.
    assert.deepEqual(
        createLessOptions({ collapseNesting: undefined }).configOptions.output,
        {},
        'collapseNesting: undefined falls back to the default'
    );

    // compress + sourceMap map into output; URL options go to the Less plugin.
    assert.deepEqual(createLessOptions({ compress: true }).configOptions.output, [{ compress: true }]);
    assert.deepEqual(createLessOptions({ sourceMap: true }).configOptions.output, [{ sourceMap: true }]);
    assert.deepEqual(
        createLessOptions({ sourceMap: { sourceMapFileInline: true } }).configOptions.output,
        [{ sourceMap: { sourceMapFileInline: true } }],
        'sourceMap object form passes through'
    );
    {
        // Flat legacy sourceMap* options fold into the object form.
        const out = createLessOptions({ sourceMap: true, sourceMapURL: 'x.map' }).configOptions.output;
        assert.deepEqual(out, [{ sourceMap: { sourceMapURL: 'x.map' } }]);
    }
    // Combined options share one entry (compiler resolves all keys from it).
    assert.deepEqual(
        createLessOptions({ collapseNesting: 'native', compress: true, sourceMap: true }).configOptions.output,
        [{ collapseNesting: 'native', compress: true, sourceMap: true }],
        'collapseNesting + compress + sourceMap combine in one entry'
    );
    // globalVars / modifyVars / javascriptEnabled stay rejected.
    for (const option of ['globalVars', 'modifyVars', 'javascriptEnabled']) {
        assert.throws(
            () => createLessOptions({ [option]: option === 'javascriptEnabled' ? true : {} }),
            new RegExp(`${option} is not supported`),
            `${option} still rejected`
        );
    }

    // 'native' distributes the child selector list (each branch keeps its own
    // specificity); 'compact' folds it into a single :is().
    const listNest = '.a, .b { .c, .d { x: 1 } }\n';
    const nativeCss = (await less.render(listNest, { collapseNesting: 'native' })).css;
    assert.match(nativeCss, /:is\(\.a, \.b\) \.c/, "'native' distributes .c");
    assert.match(nativeCss, /:is\(\.a, \.b\) \.d/, "'native' distributes .d");
    assert.doesNotMatch(nativeCss, /:is\(\.c, \.d\)/, "'native' does not fold the child list");
    const compactCss = (await less.render(listNest, { collapseNesting: 'compact' })).css;
    assert.match(compactCss, /:is\(\.a, \.b\) :is\(\.c, \.d\)/, "'compact' folds the child list");

    const source = '.parent { before: 1; .child { inside: 2; } after: 3; }\n';
    assert.equal((await less.render(source)).css, `.parent {
  before: 1;
  .child {
    inside: 2;
  }
  after: 3;
}
`);
    assert.equal((await less.render(source, { collapseNesting: true })).css, `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`);

    await assert.rejects(
        less.render('@Eight: 8;\n@charset "UTF-@{Eight}";\n', {
            filename: 'dynamic-charset.less'
        }),
        error => {
            assert.equal(error.type, 'parse');
            assert.equal(error.message, 'Interpolation is not valid in @charset.');
            assert.equal(error.filename, 'dynamic-charset.less');
            assert.equal(error.line, 2);
            assert.equal(error.column, 1);
            assert.deepEqual(error.extract, [
                '@Eight: 8;',
                '@charset "UTF-@{Eight}";',
                ''
            ]);
            assert.equal(String(error), 'Error: Interpolation is not valid in @charset.');
            assert.doesNotMatch(String(error), /offset/i);
            assert.equal(error.jessErrors?.[0]?.code, 'parse/dynamic-charset');
            assert.equal(error.jessErrors?.[0]?.message, error.message);
            assert.deepEqual(error.jessErrors?.[0]?.lines, {
                1: '@Eight: 8;',
                2: '@charset "UTF-@{Eight}";',
                3: ''
            });
            return true;
        },
        'Less 5 rejects dynamic @charset with a dedicated parse diagnostic'
    );
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'lessc-alpha-'));
try {
    const imported = path.join(tempDir, 'imported.less');
    const input = path.join(tempDir, 'input.less');
    const output = path.join(tempDir, 'output.css');
    const nested = path.join(tempDir, 'nested.less');
    const nestedOutput = path.join(tempDir, 'nested.css');
    const broken = path.join(tempDir, 'broken.less');
    const dynamicCharset = path.join(tempDir, 'dynamic-charset.less');

    await writeFile(path.join(tempDir, 'styles.config.cjs'), [
        'module.exports = {',
        '  output: [{ file: \'{name}.css\', collapseNesting: false }]',
        '};',
        ''
    ].join('\n'));
    await writeFile(imported, '.from-import { color: green; }\n');
    await writeFile(input, '@import "imported.less";\n.from-file { width: (1 + 1); }\n');
    await writeFile(nested, '.parent { before: 1; .child { inside: 2; } after: 3; }\n');
    await writeFile(broken, '.broken { color: red;\n');
    await writeFile(dynamicCharset, '@Eight: 8;\n@charset "UTF-@{Eight}";\n');

    const collapsedCss = `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`;

    assert.equal(
        (await less.renderFile(nested, { collapseNesting: true })).css,
        collapsedCss,
        'an explicit Less renderFile option overrides a file-local output config'
    );

    const version = await runLessc(['--version']);
    assert.equal(version.code, 0, version.stderr);
    assert.match(version.stdout, /^lessc \d+\.\d+\.\d+-alpha\.\d+ \(Less Compiler\) \[Jess\]\n$/);
    assert.equal(version.stderr, '');

    const help = await runLessc(['--help']);
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /--collapse-nesting/,
        'lessc help documents the supported alpha nesting flag');
    assert.match(help.stdout, /This release intentionally supports a smaller CLI surface/,
        'lessc help explicitly scopes the supported CLI surface');
    assert.match(help.stdout, /--source-map\[=FILE\]/,
        'lessc help documents the supported source-map flag');
    assert.match(help.stdout, /--compress/,
        'lessc help documents the supported compress flag');
    assert.doesNotMatch(help.stdout, /--plugin=/,
        'lessc help must not advertise unsupported plugin flags in alpha.1');

    for (const flag of ['--clean-css', '--plugin=less-plugin-clean-css', '--bogus']) {
        const unsupported = await runLessc([flag, '-'], '.unsupported { color: red; }\n');
        assert.equal(unsupported.code, 1, `${flag} must fail instead of silently no-oping`);
        assert.equal(unsupported.stdout, '', `${flag} must not emit CSS after rejecting the option`);
        assert.match(unsupported.stderr, /not supported/,
            `${flag} must explain the alpha CLI surface`);
    }

    const stdin = await runLessc(['-'], '.from-stdin { color: blue; }\n');
    assert.equal(stdin.code, 0, stdin.stderr);
    assert.match(stdin.stdout, /\.from-stdin\s*\{[\s\S]*color:\s*blue;/);
    assert.equal(stdin.stderr, '');

    const warning = await runLessc(['-'], '.warn { color: lighten(red, nope); }\n');
    assert.equal(warning.code, 0, warning.stderr);
    assert.match(warning.stdout, /\.warn\s*\{[\s\S]*color:\s*lighten\(red, nope\);/,
        'warning-producing compiles still emit CSS on stdout');
    assert.doesNotMatch(warning.stdout, /function\/unresolved/,
        'lessc must not mix warnings into CSS stdout');
    // jess DESIGN-DECISIONS C17/R3 + function-error-public-semantics.test.ts: a
    // lenient (default functionMode) un-evaluable Less function is preserved
    // VERBATIM with no diagnostic; strict functionMode:'error' would reject with
    // eval/invalid-function. There is no `function/unresolved` warning in jess's
    // vocabulary, so a successful default compile emits nothing on stderr.
    assert.equal(warning.stderr, '',
        'lenient un-evaluable Less functions are preserved verbatim with no stderr diagnostic (jess C17/R3)');

    const quietWarning = await runLessc(['--quiet', '-'], '.warn { color: lighten(red, nope); }\n');
    assert.equal(quietWarning.code, 0, quietWarning.stderr);
    assert.match(quietWarning.stdout, /\.warn\s*\{/);
    assert.equal(quietWarning.stderr, '', '--quiet suppresses successful warning diagnostics');

    const collapsed = await runLessc(
        ['--collapse-nesting', '-'],
        '.parent { before: 1; .child { inside: 2; } after: 3; }\n'
    );
    assert.equal(collapsed.code, 0, collapsed.stderr);
    assert.equal(collapsed.stderr, '');
    assert.equal(collapsed.stdout, `.parent {
  before: 1;
}
.parent .child {
  inside: 2;
}
.parent {
  after: 3;
}
`);

    const collapsedFile = await runLessc(['--collapse-nesting', nested, nestedOutput]);
    assert.equal(collapsedFile.code, 0, collapsedFile.stderr);
    assert.equal(collapsedFile.stderr, '');
    assert.equal(await readFile(nestedOutput, 'utf8'), collapsedCss,
        'file-mode lessc preserves declaration source order while collapsing nesting');

    // --compress / --math / --url-args / --rootpath forward to the render options
    // the API already supports (see alpha-support.mjs for the API-level coverage).
    const urlInput = path.join(tempDir, 'urls.less');
    await writeFile(urlInput, '.a { color: red; background: url(img.png); }\n');

    const compressed = await runLessc(['--compress', urlInput]);
    assert.equal(compressed.code, 0, compressed.stderr);
    assert.doesNotMatch(compressed.stdout, /\n\s*\n/, '--compress strips blank lines');
    assert.match(compressed.stdout, /color:red/, '--compress minifies declarations');

    const mathAlways = await runLessc(['--math=always', '-'], '.a { width: 2 + 3 * 4; }\n');
    assert.equal(mathAlways.code, 0, mathAlways.stderr);
    assert.match(mathAlways.stdout, /width:\s*14/, '--math=always evaluates unparenthesized math');

    const urlArgs = await runLessc(['--url-args=v=9', urlInput]);
    assert.equal(urlArgs.code, 0, urlArgs.stderr);
    assert.match(urlArgs.stdout, /url\(img\.png\?v=9\)/, '--url-args appends the query');

    const rootpath = await runLessc(['--rootpath=/cdn/', urlInput]);
    assert.equal(rootpath.code, 0, rootpath.stderr);
    assert.match(rootpath.stdout, /url\(\/cdn\/img\.png\)/, '--rootpath prepends to url() references');

    // Source maps: `--source-map` writes a sidecar <output>.map and annotates the
    // CSS with its basename; `--source-map-inline` embeds a data URI instead.
    const smOutput = path.join(tempDir, 'sm.css');
    const sm = await runLessc(['--source-map', input, smOutput]);
    assert.equal(sm.code, 0, sm.stderr);
    assert.match(sm.stdout, /lessc: wrote .+sm\.css\.map\n/, '--source-map reports the sidecar map it wrote');
    const smCss = await readFile(smOutput, 'utf8');
    assert.match(smCss, /\/\*# sourceMappingURL=sm\.css\.map \*\/\n$/,
        '--source-map annotates the CSS with the sidecar map basename');
    const smMap = JSON.parse(await readFile(`${smOutput}.map`, 'utf8'));
    assert.equal(smMap.version, 3, 'the sidecar map is source-map v3');
    assert.equal(smMap.file, 'sm.css', 'map.file is the CSS output name');
    assert.ok(smMap.sources.some(s => s.endsWith('input.less')), 'the map carries the input source');

    // A map written to a different directory than the CSS must be annotated
    // relative to the CSS output directory, not as a bare basename.
    const crossMap = path.join(tempDir, 'maps', 'app.map');
    const crossCss = path.join(tempDir, 'dist', 'app.css');
    const cross = await runLessc([`--source-map=${crossMap}`, input, crossCss]);
    assert.equal(cross.code, 0, cross.stderr);
    assert.match(await readFile(crossCss, 'utf8'), /sourceMappingURL=\.\.\/maps\/app\.map \*\//,
        'a cross-directory --source-map annotates the CSS with a path relative to the output dir');

    const inlineOut = path.join(tempDir, 'inline.css');
    const inlineSm = await runLessc(['--source-map-inline', input, inlineOut]);
    assert.equal(inlineSm.code, 0, inlineSm.stderr);
    assert.match(await readFile(inlineOut, 'utf8'), /sourceMappingURL=data:application\/json;base64,/,
        '--source-map-inline embeds the map as a data URI');
    await assert.rejects(readFile(`${inlineOut}.map`, 'utf8'),
        '--source-map-inline writes no sidecar .map file');

    // Path variants: basepath strips, rootpath prepends, include-source embeds
    // content, --source-map-url overrides the annotation. basepath must match the
    // real (symlink-resolved) tempDir the compiler records for the source.
    const realTempDir = await realpath(tempDir);
    const variantMapPath = path.join(tempDir, 'variant.map');
    const variantOut = path.join(tempDir, 'variant.css');
    const variant = await runLessc([
        `--source-map=${variantMapPath}`,
        `--source-map-basepath=${realTempDir}`,
        '--source-map-rootpath=http://cdn/',
        '--source-map-include-source',
        '--source-map-url=/assets/variant.map',
        input, variantOut
    ]);
    assert.equal(variant.code, 0, variant.stderr);
    assert.match(await readFile(variantOut, 'utf8'), /sourceMappingURL=\/assets\/variant\.map \*\//,
        '--source-map-url overrides the annotation URL');
    const variantMap = JSON.parse(await readFile(variantMapPath, 'utf8'));
    assert.ok(variantMap.sources.length > 0 && variantMap.sources.every(s => s.startsWith('http://cdn/')),
        '--source-map-rootpath prepends every source');
    assert.ok(variantMap.sources.every(s => !s.includes(realTempDir)),
        '--source-map-basepath strips the base from every source');
    assert.ok(Array.isArray(variantMap.sourcesContent) && variantMap.sourcesContent.length > 0,
        '--source-map-include-source embeds sourcesContent');

    const file = await runLessc([input, output]);
    assert.equal(file.code, 0, file.stderr);
    assert.match(file.stdout, /^lessc: wrote .+output\.css\n$/);
    assert.equal(file.stderr, '');
    const css = await readFile(output, 'utf8');
    assert.match(css, /\.from-import\s*\{[\s\S]*color:\s*green;/,
        'file compilation resolves a sibling import through the CLI');
    assert.match(css, /\.from-file\s*\{[\s\S]*width:\s*2;/);

    const failure = await runLessc([broken]);
    assert.equal(failure.code, 1, 'a Less error is a failing lessc process');
    assert.equal(failure.stdout, '');
    assert.ok(failure.stderr.includes(`${ESC}[91m`),
        'lessc reports colored Linecraft diagnostics by default');
    assertNoUiControlSequences(failure.stderr, 'lessc diagnostics');
    assert.match(failure.stderr, /[\u256d\u2570]/u,
        'lessc reports Linecraft source framing by default');
    const failureStderr = stripTerminalFormatting(failure.stderr);
    assert.match(failureStderr, /parse\/syntax-error \[parse\]/,
        'lessc reports the Linecraft diagnostic code on stderr');
    assert.match(failureStderr, /broken\.less:2:1/,
        'lessc reports filename, line, and column on stderr');
    assert.match(failureStderr, /\.broken \{ color: red;/,
        'lessc reports the source line on stderr');
    assert.doesNotMatch(failureStderr, /offset/i,
        'lessc diagnostics must not expose raw offsets to users');
    assert.doesNotMatch(failureStderr, / on line \d+, column \d+/,
        'lessc must not reformat Linecraft diagnostics into Less 4-style text');
    assert.doesNotMatch(failureStderr, /^Error: Less parser error\.$/m,
        'lessc must not append a duplicate plain Error after a Linecraft diagnostic');

    const dynamicCharsetFailure = await runLessc([dynamicCharset]);
    assert.equal(dynamicCharsetFailure.code, 1, 'dynamic @charset is a failing lessc process');
    assert.equal(dynamicCharsetFailure.stdout, '');
    const dynamicCharsetStderr = stripTerminalFormatting(dynamicCharsetFailure.stderr);
    assert.match(dynamicCharsetStderr, /parse\/dynamic-charset \[parse\]/,
        'lessc reports the canonical Jess diagnostic code for dynamic @charset');
    assert.match(dynamicCharsetStderr, /Interpolation is not valid in @charset\./,
        'lessc preserves the canonical Jess diagnostic message');
    assert.doesNotMatch(dynamicCharsetStderr, /Interpolation in @charset is not supported\./,
        'lessc must not restore the old Less wrapper message rewrite');

    const silentFailure = await runLessc(['--silent', broken]);
    assert.equal(silentFailure.code, 1, '--silent should still fail malformed input');
    assert.equal(silentFailure.stdout, '');
    assert.equal(silentFailure.stderr, '', '--silent must suppress Jess diagnostics');

    const noColorFailure = await runLessc(['--no-color', broken]);
    assert.equal(noColorFailure.code, 1, '--no-color should still fail malformed input');
    assert.equal(noColorFailure.stdout, '');
    assert.equal(noColorFailure.stderr.includes(ESC), false,
        '--no-color must suppress ANSI and terminal control sequences');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

console.log('Jess-powered lessc alpha tests passed');
