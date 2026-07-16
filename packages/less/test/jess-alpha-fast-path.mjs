import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import less from '../lib/index.js';
import { createLessOptions } from '../lib/options.js';

function pluginNames(configOptions) {
    return configOptions.compile.plugins.map(plugin => plugin.name);
}

{
    const { configOptions } = createLessOptions({});
    assert.deepEqual(pluginNames(configOptions), ['less', 'less-compat']);
}

{
    const { configOptions } = createLessOptions({ __jessSkipLessCompatWhenPluginFree: true });
    assert.deepEqual(pluginNames(configOptions), ['less']);
}

{
    const plugin = { install() {} };
    const { configOptions } = createLessOptions({
        plugins: [plugin],
        __jessSkipLessCompatWhenPluginFree: true
    });
    assert.deepEqual(pluginNames(configOptions), ['less', 'less-compat']);
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'less-alpha-imported-plugin-'));
try {
    const pluginPath = path.join(tempDir, 'imported-plugin.js');
    const importedPath = path.join(tempDir, 'imported.less');
    const mainPath = path.join(tempDir, 'main.less');

    await writeFile(pluginPath, [
        'functions.add("imported-value", function() {',
        '  return new tree.Anonymous("imported-ok");',
        '});',
        ''
    ].join('\n'));
    await writeFile(importedPath, '@plugin "./imported-plugin.js";\n');
    await writeFile(mainPath, '@import "imported.less";\n.probe { value: imported-value(); }\n');

    const source = '@import "imported.less";\n.probe { value: imported-value(); }\n';
    const result = await less.render(source, {
        filename: mainPath,
        paths: [tempDir]
    });

    assert.match(result.css, /value:\s*imported-ok/);
} finally {
    await rm(tempDir, { recursive: true, force: true });
}

console.log('Jess alpha fast-path tests passed');
