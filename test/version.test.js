var carto = require('../lib/carto');
var fs = require('fs');
var path = require('path');
var assert = require('assert');


describe('Version check', function() {
    it('test version matches package.json version and changelog', function() {
        if (parseInt(process.version.split('.')[1]) > 4) {
            var info = require('../package.json');
            assert.deepEqual(info.version.split('.'), carto.version);
        } else {
            var info = JSON.parse(require('fs').readFileSync(path.join(__dirname,'../package.json')));
            assert.deepEqual(info.version.split('.'), carto.version);
        }
    });
});
