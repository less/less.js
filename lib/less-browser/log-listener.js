module.exports = function(less, options) {

    var logLevel_debug = 3,
        logLevel_info = 2,
        logLevel_errors = 1,
        logLevel_none =  0;

    // The amount of logging in the javascript console.
    // 3 - Debug, information and errors
    // 2 - Information and errors
    //  1 - Errors
    // 0 - None
    // Defaults to 2
    options.logLevel = typeof(options.logLevel) !== 'undefined' ? options.logLevel : (options.env === 'development' ?  logLevel_debug : logLevel_errors);

    if (!options.loggers) {
        options.loggers = [{
            debug: function(msg) {
                if (options.logLevel >= logLevel_debug) {
                    console.log(msg);
                }
            },
            info: function(msg) {
                if (options.logLevel >= logLevel_info) {
                    console.log(msg);
                }
            },
            warn: function(msg) {
                if (options.logLevel >= logLevel_warn) {
                    console.warn(msg);
                }
            },
            error: function(msg) {
                if (options.logLevel >= logLevel_error) {
                    console.error(msg);
                }
            }
        }];
    }
    for(var i = 0; i < options.loggers.length; i++) {
        less.logger.addListener(options.loggers[i]);
    }
};
