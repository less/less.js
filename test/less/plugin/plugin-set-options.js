var optionsStack = [
    'option1',
    null,
    'option2',
    null,
    'option3'
];

var options, error;

registerPlugin({
    install: function(less, pluginManager, functions) {
        if (!options) {
            error = 'setOptions() not called before install';
        }
    },
    use: function() {
        if (options != optionsStack.shift()) {
            error = 'setOptions() not setting option correctly';
        }
        if (error) {
            throw new Error(error);
        }
    },
    setOptions: function(opts) {
        options = opts;
    }
});
