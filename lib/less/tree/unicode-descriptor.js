import Node from "./node";

export default class UnicodeDescriptor extends Node {
    constructor(value) {
        super();
        this.value = value;
    }
}

UnicodeDescriptor.prototype.type = "UnicodeDescriptor";
