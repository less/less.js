(function(tree) {

tree.FontSet = function(env, fonts) {
    this.fonts = fonts;
    this.name = 'fontset-' + env.effects.length;
};

tree.FontSet.prototype.toXML = function(env) {
    return '<FontSet name="'
        + this.name
        + '">\n'
        + this.fonts.map(function(f) {
            return '  <Font face_name="' + f +'"/>';
        }).join('\n')
        + '\n</FontSet>'
};

})(require('mess/tree'));
