// CJS compatibility wrapper.
// Node 20.19+ and 22+ can require() ESM natively. For Node 18, we use
// a lazy Proxy with dynamic import() — works because render()/parse()
// already return promises, so the async layer is invisible.
const [major, minor] = process.versions.node.split('.').map(Number);

if (major >= 22 || (major === 20 && minor >= 19)) {
    module.exports = require('./lib/less-node/index.js').default;
} else {
    let _less;
    const _loading = import('./lib/less-node/index.js').then(m => { _less = m.default; });

    module.exports = new Proxy(Object.create(null), {
        get(_, prop) {
            if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                return undefined;
            }
            if (_less) {
                return _less[prop];
            }
            return function (...args) {
                return _loading.then(() => {
                    const val = _less[prop];
                    return typeof val === 'function' ? val.apply(_less, args) : val;
                });
            };
        },
        has(_, prop) {
            return _less ? prop in _less : true;
        },
        ownKeys() {
            return _less ? Reflect.ownKeys(_less) : [];
        },
        getOwnPropertyDescriptor(_, prop) {
            if (_less) {
                return Object.getOwnPropertyDescriptor(_less, prop);
            }
            return { configurable: true, enumerable: true };
        }
    });
}
