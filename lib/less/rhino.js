// Command line integration via Rhino
(function (args) {
    name = args[0];
    var output = args[1];

    if (!name) {
        print('No files present in the fileset; Check your pattern match in build.xml');
        quit(1);
    }
    path = name.split("/");path.pop();path=path.join("/")

    var input = readFile(name);

    if (!input) {
        print('lesscss: couldn\'t open file ' + name);
        quit(1);
    }

    var result;
    var parser = new less.Parser();
    parser.parse(input, function (e, root) {
        if (e) {
            quit(1);
        } else {
            result = root.toCSS();
            if (output) {
                writeFile(output, result);
                print("Written to " + output);
            } else {
                print(result);
            }
            quit(0);
        }
    });
    print("done");
}(arguments));
