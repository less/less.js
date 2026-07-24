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
    return value
        .replace(/\x1B\]8;;[^\x1B]*(?:\x1B\\|\x07)/gu, '')
        .replace(/\x1B\[[0-?]*[ -/]*[@-~]/gu, '');
}

const jessEntrypoint = fileURLToPath(import.meta.resolve('jess'));
assert.match(jessEntrypoint, /[/\\]jess[/\\]lib[/\\]index\.js$/,
    'the Less CLI must resolve the built Jess package entrypoint');
await realpath(jessEntrypoint);

{
    assert.deepEqual(createLessOptions({}).configOptions.output, {});
    assert.deepEqual(
        createLessOptions({ collapseNesting: true }).configOptions.output,
        [{ collapseNesting: true }]
    );

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
            assert.equal(error.message, 'Less 5 does not support interpolation in @charset.');
            assert.equal(error.filename, 'dynamic-charset.less');
            assert.equal(error.line, 2);
            assert.equal(error.column, 1);
            assert.deepEqual(error.extract, [
                '@Eight: 8;',
                '@charset "UTF-@{Eight}";',
                ''
            ]);
            assert.equal(String(error), 'Error: Less 5 does not support interpolation in @charset.');
            assert.doesNotMatch(String(error), /offset/i);
            assert.equal(error.jessErrors?.[0]?.code, 'parse/dynamic-charset');
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
    assert.match(help.stdout, /Less 5 alpha\.1 intentionally supports a smaller CLI surface/,
        'lessc help explicitly scopes the alpha CLI surface');
    assert.doesNotMatch(help.stdout, /--source-map/,
        'lessc help must not advertise unsupported source-map flags in alpha.1');
    assert.doesNotMatch(help.stdout, /--plugin=/,
        'lessc help must not advertise unsupported plugin flags in alpha.1');

    const stdin = await runLessc(['-'], '.from-stdin { color: blue; }\n');
    assert.equal(stdin.code, 0, stdin.stderr);
    assert.match(stdin.stdout, /\.from-stdin\s*\{[\s\S]*color:\s*blue;/);
    assert.equal(stdin.stderr, '');

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
    const failureStderr = stripTerminalFormatting(failure.stderr);
    assert.match(failureStderr, /parse\/syntax-error \[parse\]/,
        'lessc reports the Linecraft diagnostic code on stderr');
    assert.match(failureStderr, /broken\.less:1:1/,
        'lessc reports filename, line, and column on stderr');
    assert.match(failureStderr, /\.broken \{ color: red;/,
        'lessc reports the source line on stderr');
    assert.doesNotMatch(failureStderr, /offset/i,
        'lessc diagnostics must not expose raw offsets to users');
    assert.doesNotMatch(failureStderr, / on line \d+, column \d+/,
        'lessc must not reformat Linecraft diagnostics into Less 4-style text');
    assert.doesNotMatch(failureStderr, /^Error: Less parser error\.$/m,
        'lessc must not append a duplicate plain Error after a Linecraft diagnostic');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

console.log('Jess-powered lessc alpha tests passed');
