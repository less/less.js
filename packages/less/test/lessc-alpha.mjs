import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

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

const jessEntrypoint = fileURLToPath(import.meta.resolve('jess'));
assert.match(jessEntrypoint, /[/\\]jess[/\\]lib[/\\]index\.js$/,
    'the Less CLI must resolve the built Jess package entrypoint');
await realpath(jessEntrypoint);

const tempDir = await mkdtemp(path.join(tmpdir(), 'lessc-alpha-'));
try {
    const imported = path.join(tempDir, 'imported.less');
    const input = path.join(tempDir, 'input.less');
    const output = path.join(tempDir, 'output.css');
    const broken = path.join(tempDir, 'broken.less');

    await writeFile(imported, '.from-import { color: green; }\n');
    await writeFile(input, '@import "imported.less";\n.from-file { width: (1 + 1); }\n');
    await writeFile(broken, '.broken { color: red;\n');

    const version = await runLessc(['--version']);
    assert.equal(version.code, 0, version.stderr);
    assert.match(version.stdout, /^lessc \d+\.\d+\.\d+-alpha\.\d+ \(Less Compiler\) \[Jess\]\n$/);
    assert.equal(version.stderr, '');

    const stdin = await runLessc(['-'], '.from-stdin { color: blue; }\n');
    assert.equal(stdin.code, 0, stdin.stderr);
    assert.match(stdin.stdout, /\.from-stdin\s*\{[\s\S]*color:\s*blue;/);
    assert.equal(stdin.stderr, '');

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
    assert.match(failure.stderr, /error|unexpected|invalid|parse|syntax/i,
        'lessc reports a useful compile diagnostic on stderr');
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

console.log('Jess-powered lessc alpha tests passed');
