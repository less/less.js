import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import less from '../lib/index.js';

const unsupportedForAlpha1 = [
    {
        area: 'Full Less 4 parity corpus',
        detail: 'The broad packages/test-data fixture sweep remains a compatibility backlog, not the alpha.1 release gate.'
    },
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

function printUnsupportedInventory() {
    console.log('\nLess 5 alpha.1 unsupported inventory:');
    for (const entry of unsupportedForAlpha1) {
        console.log(`- ${entry.area}: ${entry.detail}`);
    }
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
            assert.match(String(error), /ParseError: Less 5 does not support interpolation in @charset\./);
            assert.doesNotMatch(String(error), /offset/i);
            return true;
        }
    );
}

await assertSupportedCompileSurface();
await assertUnsupportedSyntaxHasPreciseDiagnostic();
printUnsupportedInventory();

console.log('\nLess 5 alpha.1 support contract passed');
