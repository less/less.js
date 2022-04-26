import Node from './node';
import Variable from './variable';
import Property from './property';
import * as utils from '../utils';


const Quoted = function(str, content, escaped, index, currentFileInfo) {
    this.escaped = (escaped === undefined) ? true : escaped;
    this.value = content || '';
    this.quote = str.charAt(0);
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.variableRegex = /@\{([\w-]+)\}/g;
    this.propRegex = /\$\{([\w-]+)\}/g;
    this.allowRoot = escaped;
};

Quoted.prototype = Object.assign(new Node(), {
    type: 'Quoted',

    genCSS(context, output) {
        if (!this.escaped) {
            output.add(this.quote, this.fileInfo(), this.getIndex());
        }
        output.add(this.value);
        if (!this.escaped) {
            output.add(this.quote);
        }
    },

    containsVariables() {
        return this.value.match(this.variableRegex);
    },

    eval(context) {
        const that = this;
        let value = this.value;
        const variableReplacement = function (_, name) {
            const v = new Variable(`@${name}`, that.getIndex(), that.fileInfo()).eval(context, true);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        const propertyReplacement = function (_, name) {
            const v = new Property(`$${name}`, that.getIndex(), that.fileInfo()).eval(context, true);
            return (v instanceof Quoted) ? v.value : v.toCSS();
        };
        function iterativeReplace(value, regexp, replacementFnc) {
            let evaluatedValue = value;
            do {
                value = evaluatedValue.toString();
                evaluatedValue = value.replace(regexp, replacementFnc);
            } while (value !== evaluatedValue);
            return evaluatedValue;
        }
        value = iterativeReplace(value, this.variableRegex, variableReplacement);
        value = iterativeReplace(value, this.propRegex, propertyReplacement);
        return new Quoted(this.quote + value + this.quote, value, this.escaped, this.getIndex(), this.fileInfo());
    },

    compare(other) {
        // when comparing quoted strings allow the quote to differ
        if (other.type === 'Quoted' && !this.escaped && !other.escaped) {
            return Node.numericCompare(this.value, other.value);
        } else {
            return other.toCSS && this.toCSS() === other.toCSS() ? 0 : undefined;
        }
    }
});

export default Quoted;
