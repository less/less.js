module.exports = {
    install : function( less, pluginManager ) {
        less.functions.functionRegistry.add( "test", function() {
            return new less.tree.Anonymous( "OK" );
        });
    }
}