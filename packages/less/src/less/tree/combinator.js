import Node from './node';
const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

const Combinator = function(value) {
    if (value === ' ') {
        this.value = ' ';
        this.emptyOrWhitespace = true;
    } else {
        this.value = value ? value.trim() : '';
        this.emptyOrWhitespace = this.value === '';
    }
};

Combinator.prototype = new Node();

Combinator.prototype.genCSS = function(context, output) {
    const spaceOrEmpty = (context.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
    output.add(spaceOrEmpty + this.value + spaceOrEmpty);
};

Combinator.prototype.type = 'Combinator';

export default Combinator;
