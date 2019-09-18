declare class Visitor {
    constructor();
    visit(node: any): any;
    visitArray(nodes: any, nonReplacing: any): any;
    flatten(arr: any, out: any): any;
}
export default Visitor;
