var diff = require('./diff');

var d = diff.diff('abc\ndef\nghi', 'bcd\ndef\nghj');

require('sys').print(d.del + '\n');
require('sys').print(d.ins);