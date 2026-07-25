import mathHelper from './math-helper.js';

const mathFunctions = {
    // name:  [unit, has a CSS equivalent that the browser can evaluate]
    ceil:  [null, false],
    floor: [null, false],
    sqrt:  [null, true],
    abs:   [null, true],
    tan:   ['', true],
    sin:   ['', true],
    cos:   ['', true],
    atan:  ['rad', true],
    asin:  ['rad', true],
    acos:  ['rad', true]
};

for (const f in mathFunctions) {
    // eslint-disable-next-line no-prototype-builtins
    if (mathFunctions.hasOwnProperty(f)) {
        const [unit, cssEvaluable] = mathFunctions[f];
        mathFunctions[f] = mathHelper.bind(null, Math[f], unit, cssEvaluable);
    }
}

mathFunctions.round = (n, f) => {
    const fraction = typeof f === 'undefined' ? 0 : f.value;
    return mathHelper(num => num.toFixed(fraction), null, false, n);
};

export default mathFunctions;
