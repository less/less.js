less._path = {
    join: function() {
        var parts = [];
        for (i in arguments) {
            parts = parts.concat(arguments[i].split('/'));
        }
        var result = [];
        for (i in parts) {
            var part = parts[i];
            if (part === '..' && result.length > 0) {
                result.pop();
            } else if (part === '' && result.length > 0) {
                // skip
            } else if (part !== '.') {
                result.push(part);
            }
        }
        return result.join('/');
    },
    dirname: function(p) {
        var path = p.split('/');
        path.pop();
        return path.join('/');
    },
    basename: function(p, ext) {
        var base = p.split('/').pop();
        if (ext) {
            var index = base.lastIndexOf(ext);
            if (base.length === index + ext.length) {
                base = base.substr(0, index);
            }
        }
        return base;
    },
    extname: function(p) {
        var index = p.lastIndexOf('.');
        return index > 0 ? p.substring(index) : '';
    }
};

less._fs = {
    readFileSync: function(name) {
        var file = new java.io.File(name);
        var stream = new java.io.FileInputStream(file);
        var buffer = [];
        var c;
        while ((c = stream.read()) != -1) {
            buffer.push(c);
        }
        stream.close();
        return {
            length: buffer.length,
            toString: function(enc) {
                if (enc === 'base64') {
                    return javax.xml.bind.DatatypeConverter.printBase64Binary(buffer);
                }
            }
        };
    }
};
