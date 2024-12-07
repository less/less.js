/* eslint-disable no-prototype-builtins */
import Node from './node';

const CustomProperty = function (name, initialValue, index, currentFileInfo) {
    this.name = name;
    this.initialValue = initialValue;
    this._index = index;
    this._fileInfo = currentFileInfo;
};

CustomProperty.prototype = Object.assign(new Node(), {
    type: 'CustomProperty',

    genCSS: function (context, output) {
        output.add('var(' + this.name + (this.initialValue ? ', ' + this.initialValue : '') + ')');
    }
});

export default CustomProperty;
