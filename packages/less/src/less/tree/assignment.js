import Node from './node';

const Assignment = function(key, val) {
    this.key = key;
    this.value = val;
}

Assignment.prototype = Object.assign(new Node(), {
    type: 'Assignment',

    accept(visitor) {
        this.value = visitor.visit(this.value);
    },

    eval(context) {
        if (this.value.eval) {
            return new Assignment(this.key, this.value.eval(context));
        }
        return this;
    },

    genCSS(context, output) {
        output.add(`${this.key}=`);
        if (this.value.genCSS) {
            this.value.genCSS(context, output);
        } else {
            output.add(this.value);
        }
    }
});

export default Assignment;
