// Define a function as entry for rhinos javascript compiler
function compileLess(inputFile) {
    name = inputFile; 
    path = name.split("/");path.pop();path=path.join("/")
    var input = readFile(name);
    var result;
    var parser = new less.Parser();
    parser.parse(input, function (e, root) {
        if (!e) {
            result = root.toCSS();
        }
        else {
            throw e;
        } 
    });
    return result;
}
