#!/usr/bin/env node

var path = require('path'),
    fs = require('fs');

var bless = exports;

bless.Parser = function Parser(env) {
    this.env = env = env || {};
    var output = this.env.filename;
    var options = this.env.options;
    
    //
    // The Parser
    //
    return parser = {
        //
        // Parse an input string,
        // call `callback` when done.
        //
        parse: function (str, callback) {
            var files = [];
            var error = null;
            
            var limit = 4095;
            var selectors = str.match(/[^,\{\}]*(,|\{[^\{\}]*\}\s*)/g);
            var numFiles = Math.ceil(selectors.length / limit);
            
            var ext = path.extname(output);
            var filename = path.basename(output, ext);
            
            var fileIndex = numFiles;
            var fileContents;
            
            while (selectors.length > limit)
            {                
                var newFilename = fileIndex > 1 ? output.replace(ext, fileIndex + ext) : output;
                fileContents = selectors.splice(0, limit);
                
                while (!fileContents[fileContents.length - 1].match(/[^,\{\}]*(\{[^\{\}]*\}\s*)/g)) {
                    selectors.unshift(fileContents.pop());
                }
                
                var lastIndex = fileContents.length - 1;
                fileContents[lastIndex] = fileContents[lastIndex].replace(/\s+$/g, '');
                
                files.push({
                    filename: newFilename,
                    content: fileContents.join('')
                });

                fileIndex--;
            }
            
            fileContents = selectors;
            
            if (numFiles > 1)
            {
                fileContents.unshift('\n');

                for(var i=2; i<=numFiles; i++)
                {
                    var import = '@import url(' + filename + i + ext + ');';
                    import = options.compress ? import : import + '\n';
                    fileContents.unshift(import);
                }
            }
            
            files.push({
                filename: output,
                content: fileContents.join('')
            });

            callback(error, files);
        }
    }
}

//
// Remove previosuly generate CSS files which are no longer needed
//
bless.Parser.cleanup = function (output, callback) {
    var error = null;
    
    var dir = path.dirname(output);
    var ext = path.extname(output);
    var filename = path.basename(output, ext);
    
    var fileRegex = filename + '(\\d+)' + ext;
    var importRegex = '@import url\\((' + fileRegex + ')\\);';

    fs.readFile(output, 'utf8', function (err, data) {
        if (err) {
            callback(err);
        }
        var importsMatch = data.match(importRegex);
        var importIndex = 0;
        if (importsMatch) {
            importIndex = importsMatch[2];
        }

        fs.readdir(dir, function (err, files) {
            if (err) {
                callback(err);
            }
            for (i in files)
            {
                var file = files[i];
                var match = file.match(fileRegex);

                if (match)
                {
                    if (parseInt(match[1], 10) > importIndex) {
                        fs.unlink(path.join(dir, file), function (err) {
                            if (err) {
                                callback(err);
                            }
                        });
                    }
                }
            }
        });
    });
};