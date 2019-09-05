// Less module
import {blah} from 'blah.js';

const scopeProxy = (obj) => new Proxy(obj, {
    has() {
        return true;
    },
    get(target, prop) {
        return target[prop];
    },
    set(target, prop, value) {
        target[prop] = value;
    }
});

let output = '';
// Add vars to the prototype
const t = function() {
    return output;
};
t['@color-brand'] = undefined;

export default t;

with (scopeProxy(t)) {
    ['@var', () => 'val'];
    ['prop', () => new Expression('@var')];
    ['prop', () => ''];
}