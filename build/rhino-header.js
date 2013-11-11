if (typeof(window) === 'undefined') { less = {} }
else                                { less = window.less = {} }
tree = less.tree = {};
less.mode = 'rhino';

console = function() {
    var stdout = java.lang.Systen.out;
    var stderr = java.lang.System.err;

    function doLog(out, type) {
        return function() {
            var args = java.lang.reflect.Array.newInstance(java.lang.Object, arguments.length - 1);
            var format = arguments[0];
            var conversionIndex = 0;
            // need to look for %d (integer) conversions because in Javascript all numbers are doubles
            for (var i = 1; i < arguments.length; i++) {
                var arg = arguments[i];
                if (conversionIndex != -1) {
                    conversionIndex = format.indexOf('%', conversionIndex);
                }
                if (conversionIndex >= 0 && conversionIndex < format.length) {
                    var conversion = format.charAt(conversionIndex + 1);
                    if (conversion === 'd' && typeof arg === 'number') {
                        arg = new java.lang.Integer(new java.lang.Double(arg).intValue());
                    }
                    conversionIndex++;
                }
                args[i-1] = arg;
            }
            try {
                out.println(type + java.lang.String.format(format, args));
            } catch(ex) {
                stderr.println(ex);
            }
        }
    }
    return {
        log: doLog(stdout, ''),
        info: doLog(stdout, 'INFO: '),
        error: doLog(stderr, 'ERROR: '),
        warn: doLog(stderr, 'WARN: ')
    };
}();
