(function(tree) {

tree._getFontSet = function(env, fonts) {
    var fontKey = fonts.join('');
    if (env._fontMap && env._fontMap[fontKey]) {
        return env._fontMap[fontKey];
    }

    var new_fontset = new tree.FontSet(env, fonts);
    env.effects.push(new_fontset);
    if (!env._fontMap) env._fontMap = {};
    env._fontMap[fontKey] = new_fontset;
    return new_fontset;
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
