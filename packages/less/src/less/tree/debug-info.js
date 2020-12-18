class debugInfo {
    constructor(context, ctx, lineSeparator) {
        let result = '';
        if (context.dumpLineNumbers && !context.compress) {
            switch (context.dumpLineNumbers) {
                case 'comments':
                    result = debugInfo.asComment(ctx);
                    break;
                case 'mediaquery':
                    result = debugInfo.asMediaQuery(ctx);
                    break;
                case 'all':
                    result = debugInfo.asComment(ctx) + (lineSeparator || '') + debugInfo.asMediaQuery(ctx);
                    break;
            }
        }
        return result;
    }

    static asComment(ctx) {
        return `/* line ${ctx.debugInfo.lineNumber}, ${ctx.debugInfo.fileName} */\n`;
    }

    static asMediaQuery(ctx) {
        let filenameWithProtocol = ctx.debugInfo.fileName;
        if (!/^[a-z]+:\/\//i.test(filenameWithProtocol)) {
            filenameWithProtocol = `file://${filenameWithProtocol}`;
        }
        return `@media -sass-debug-info{filename{font-family:${filenameWithProtocol.replace(/([.:\/\\])/g, function (a) {
            if (a == '\\') {
                a = '\/';
            }
            return `\\${a}`;
        })}}line{font-family:\\00003${ctx.debugInfo.lineNumber}}}\n`;
    }
}

export default debugInfo;
