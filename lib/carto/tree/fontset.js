(function(tree) {

tree._getFontSet = function(env, fonts) {
    var find_existing = function(fonts) {
        var findFonts = fonts.join('');
        for (var i = 0; i < env.effects.length; i++) {
            if (findFonts == env.effects[i].fonts.join('')) {
                return env.effects[i];
            }
        }
    };

    var existing = false;
    if (existing = find_existing(fonts)) {
        return existing;
    } else {
        var new_fontset = new tree.FontSet(env, fonts);
        env.effects.push(new_fontset);
        return new_fontset;
    }
};

tree.FontSet = function FontSet(env, fonts) {
    this.fonts = fonts;
    this.name = 'fontset-' + env.effects.length;
};

tree.FontSet.prototype.toXML = function(env) {
    return '<FontSet name="' +
        this.name +
        '">\n' +
        this.fonts.map(function(f) {
            return '  <Font face-name="' + f +'"/>';
        }).join('\n') +
        '\n</FontSet>';
};

})(require('../tree'));
