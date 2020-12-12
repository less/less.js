import Node from './node';

const Keyword = function(value) {
    this.value = value;
};

Keyword.prototype = new Node();

Keyword.prototype.genCSS = function(context, output) {
    if (this.value === '%') { throw { type: 'Syntax', message: 'Invalid % without number' }; }
    output.add(this.value);
};

Keyword.prototype.type = 'Keyword';

Keyword.True = new Keyword('true');
Keyword.False = new Keyword('false');

export default Keyword;
