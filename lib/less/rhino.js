var name;

function loadStyleSheet(sheet, callback, reload, remaining) {
    var sheetName = name.slice(0, name.lastIndexOf('/') + 1) + sheet.href;
    var input = readFile(sheetName);
    var parser = new less.Parser({
        paths: [sheet.href.replace(/[\w\.-]+$/, '')]
    });
    parser.parse(input, function (e, root) {
        if (e) {
            return error(e, sheetName);
        }
        try {
            callback(e, root, sheet, { local: false, lastModified: 0, remaining: remaining });
        } catch(e) {
            error(e, sheetName);
        }
    });
}

function writeFile(filename, content) {
    var fstream = new java.io.FileWriter(filename);
    var out = new java.io.BufferedWriter(fstream);
    out.write(content);
    out.close();
}

// Command line integration via Rhino
(function (args) {
    name = args[0];
    var output = args[1],
        compress = args[2];

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
    try {
        var parser = new less.Parser();
        parser.parse(input, function (e, root) {
            if (e) {
                error(e, name);
                quit(1);
            } else {
                result = root.toCSS({compress: compress || false});
                if (output) {
                    writeFile(output, result);
                    print("Written to " + output);
                } else {
                    print(result);
                }
                quit(0);
            }
        });
    }
    catch(e) {
        error(e, name);
        quit(1);
    }
    print("done");
}(arguments));

function error(e, filename) {

    var content = "Error : " + filename + "\n";
    
    filename = e.filename || filename;
    
    if (e.message) {
        content += e.message + "\n";
    }

    var errorline = function (e, i, classname) {
        if (e.extract[i]) {
            content += 
                String(parseInt(e.line) + (i - 1)) + 
                ":" + e.extract[i] + "\n";
        }
    };

    if (e.stack) {
        content += e.stack;
    } else if (e.extract) {
        content += 'on line ' + e.line + ', column ' + (e.column + 1) + ':\n';
        errorline(e, 0);
        errorline(e, 1);
        errorline(e, 2);
    }
   print(content);
}