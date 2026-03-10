import Node from './node.js';

const _noSpaceCombinators = {
    '': true,
    ' ': true,
    '|': true
};

class Combinator extends Node {
    get type() { return 'Combinator'; }

    constructor(value) {
        super();
        if (value === ' ') {
            this.value = ' ';
            this.emptyOrWhitespace = true;
        } else {
            this.value = value ? value.trim() : '';
            this.emptyOrWhitespace = this.value === '';
        }
    }

    genCSS(context, output) {
        const spaceOrEmpty = (context.compress || _noSpaceCombinators[this.value]) ? '' : ' ';
        output.add(spaceOrEmpty + this.value + spaceOrEmpty);
    }
}

export default Combinator;
