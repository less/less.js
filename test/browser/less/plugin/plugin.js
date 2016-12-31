registerPlugin({
    install: function(less, pluginManager, functions) {
        functions.add('func', function() {
            return less.Anonymous(location.href);
        });
    }
});