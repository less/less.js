
var LessError = module.exports = function LessError(parser, e, env) {
    var input = parser.getInput(e, env),
        loc = parser.getLocation(e.index, input),
        line = loc.line,
        col  = loc.column,
        callLine = e.call && parser.getLocation(e.call, input).line,
        lines = input.split('\n');

    this.type = e.type || 'Syntax';
    this.message = e.message;
    this.filename = e.filename || env.currentFileInfo.filename;
    this.index = e.index;
    this.line = typeof(line) === 'number' ? line + 1 : null;
    this.callLine = callLine + 1;
    this.callExtract = lines[callLine];
    this.stack = e.stack;
    this.column = col;
    this.extract = [
        lines[line - 1],
        lines[line],
        lines[line + 1]
    ];
};

LessError.prototype = new Error();
LessError.prototype.constructor = LessError;
