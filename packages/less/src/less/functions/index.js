import functionRegistry from './function-registry.js';
import functionCaller from './function-caller.js';

import boolean from './boolean.js';
import defaultFunc from './default.js';
import color from './color.js';
import colorBlending from './color-blending.js';
import dataUri from './data-uri.js';
import list from './list.js';
import math from './math.js';
import number from './number.js';
import string from './string.js';
import svg from './svg.js';
import types from './types.js';

export default environment => {
    const functions = { functionRegistry, functionCaller };

    // register functions
    functionRegistry.addMultiple(boolean);
    functionRegistry.add('default', defaultFunc.eval.bind(defaultFunc));
    functionRegistry.addMultiple(color);
    functionRegistry.addMultiple(colorBlending);
    functionRegistry.addMultiple(dataUri(environment));
    functionRegistry.addMultiple(list);
    functionRegistry.addMultiple(math);
    functionRegistry.addMultiple(number);
    functionRegistry.addMultiple(string);
    functionRegistry.addMultiple(svg(environment));
    functionRegistry.addMultiple(types);

    return functions;
};
