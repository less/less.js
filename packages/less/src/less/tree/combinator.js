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
}

Combinator.prototype = Object.assign(new Node(), {
    type: 'Combinator',

    genCSS(context, output) {
        const spaceOrEmpty = (context.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
});

export default Combinator;
