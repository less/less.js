"use strict";
/**
 * What if classes, ids, variable and property lookups
 * were all just on Object prototype chains?
 *
 * In theory, the lookups would then be blazingly fast.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var getKey = function (prop) {
    var key = String(prop);
    if (/[a-z]/i.test(key[0])) {
        key = key.toLowerCase();
    }
    return key;
};
var scopeRegistry = function (entry) {
    var entries = [];
    return new Proxy(entry, {
        get: function (obj, prop) {
            if (!prop) {
                return;
            }
            if (prop === 'INHERIT') {
                return function () { return scopeRegistry(Object.create(obj)); };
            }
            var key = getKey(prop);
            switch (key[0]) {
                // property or variable lookup
                case '$':
                    if (key in obj) {
                    }
                case '@':
                    if (key in obj) {
                        var val = obj[key];
                        if (val !== undefined) {
                            return val[val.length - 1];
                        }
                    }
                    break;
                /** Mixin lookup */
                default:
                    var objRef = obj;
                    var mixinCandidates = [];
                    while (objRef !== null) {
                        if (objRef.hasOwnProperty(key)) {
                            mixinCandidates = mixinCandidates.concat(obj[key]);
                        }
                        objRef = Object.getPrototypeOf(objRef);
                    }
                    break;
            }
        },
        set: function (obj, prop, value) {
            if (!prop) {
                return false;
            }
            var key = getKey(prop);
            /**
             * In the case of vars, props, and mixins, the value will be
             * a reference to the rules holding this value
             */
            obj[key] = value;
        }
    });
};
exports.rootScope = scopeRegistry(Object.create(null));
//# sourceMappingURL=scope.js.map