import Node from './node';

const Keyword = function(value) {
    this.value = value;
};

Keyword.prototype = Object.assign(new Node(), {
    type: 'Keyword',

    genCSS(context, output) {
        if (this.value === '%') { throw { type: 'Syntax', message: 'Invalid % without number' }; }
        output.add(this.value);
    }
});

Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

export default Keyword;
