var name;

function loadStyleSheet(sheet, callback, reload, remaining) {
    var sheetName = name.slice(0, name.lastIndexOf('/') + 1) + sheet.href;
    var input = readFile(sheetName);
    var parser = new less.Parser();
    parser.parse(input, function (e, root) {
        if (e) {
            print("Error: " + e);
            quit(1);
        }
        callback(root, sheet, { local: false, lastModified: 0, remaining: remaining });
    });

    // callback({}, sheet, { local: true, remaining: remaining });
}

// Command line integration via Rhino
(function (args) {
    name = args[0];
    var optstr = args[1]; // arg1=val1,arg2=val2,...

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
            print("Error: " + err);
            quit(1);
        } else {
            print("Success");
            result = root.toCSS();
            print("res: "+ result);
            quit(0);
        }
    });
    print("done");
}(arguments));
