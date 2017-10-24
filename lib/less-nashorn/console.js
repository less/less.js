if (typeof console === 'undefined') {
    console = {
        log: function(msg) {
            print(msg);
        },
        info: function(msg) {
            print('INFO: ' + msg);
        },
        warn: function(msg) {
            print('WARN: ' + msg);
        },
        error: function(msg) {
            java.lang.System.err.println('ERROR: ' + msg);
        },
        dir: function(msg) {
            print('DIR: ' + JSON.stringify(msg));
        },
    };
}