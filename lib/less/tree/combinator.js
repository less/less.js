module.exports = function (tree) {

var Combinator = function (value) {
    if (value === ' ') {
        this.value = ' ';
    } else {
        this.value = value ? value.trim() : "";
    }
};
Combinator.prototype = {
    type: "Combinator",
    _outputMap: {
        ''  : '',
        ' ' : ' ',
        ':' : ' :',
        '+' : ' + ',
        '~' : ' ~ ',
        '>' : ' > ',
        '|' : '|',
        '^' : ' ^ ',
        '^^' : ' ^^ '
    },
    _outputMapCompressed: {
        ''  : '',
        ' ' : ' ',
        ':' : ' :',
        '+' : '+',
        '~' : '~',
        '>' : '>',
        '|' : '|',
        '^' : '^',
        '^^' : '^^'
    },
    genCSS: function (env, output) {
        output.add((env.compress ? this._outputMapCompressed : this._outputMap)[this.value]);
    },
    toCSS: tree.toCSS
};
return Combinator;
};
