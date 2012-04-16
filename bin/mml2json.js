#!/usr/bin/env node

var xml2js = require('xml2js'),
    fs = require('fs');

if (!process.argv[2]) {
    console.log('Please specify a XML file.');
    process.exit(1);
}

fs.readFile(process.argv[2], 'utf-8', function(err, data) {
    if (err) throw err;

    // Replace entities.
    var entities = {};
    var match = data.match(/<!ENTITY([^>]|"([^"]|\\")*")+>/g)
    if (match != null) {
        match.forEach(function(entity) {
          var parts = entity.match(/^<!ENTITY\s+(\w+)\s+"(.+)">$/);
          entities['&' + parts[1] + ';'] = parts[2];
        });
    }
    data = data.replace(/&\w+;/g, function(entity) {
        return entities[entity];
    });

    function addAttributes(obj) {
        if (obj['@']) for (var key in obj['@']) obj[key] = obj['@'][key];
        delete obj['@'];
        return obj;
    }
    
    function simplifyExternal(obj) {
        if (obj.src) return obj.src;
        else return obj;
    }

    var parser = new xml2js.Parser();
    parser.addListener('end', function(json) {
        console.log(JSON.stringify(json, function(key, value) {
            if (!key) {
                return addAttributes(value);
            }
            else if (key === 'Stylesheet') {
                if (Array.isArray(value)) return value.map(addAttributes).map(simplifyExternal);
                else return [ simplifyExternal(addAttributes(value)) ];
            }
            else if (key === 'Layer' || key === 'Stylesheet') {
                if (Array.isArray(value)) return value.map(addAttributes);
                else return [ addAttributes(value) ];
            }
            else if (key === 'Datasource') {
                value = addAttributes(value);
                value.Parameter.forEach(function(parameter) {
                    value[parameter['@'].name] = parameter['#'];
                });
                delete value.Parameter;
                return value;
            }
            else {
                return value;
            }
        }, 4));
    });
    parser.parseString(data);
});