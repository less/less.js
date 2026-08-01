import assert from 'node:assert/strict';

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

console.log('Jess alpha plugin-configuration tests passed');
