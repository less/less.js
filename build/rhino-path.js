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
    dirname: function(p) {
        var path = p.split('/');
        path.pop();
        return path.join('/');
    }
};
