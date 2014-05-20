var LessError = require('./less-error.js');

// Split the input into chunks.
module.exports = function (parser, input) {
    var len = input.length, level = 0, parenLevel = 0,
        lastOpening, lastOpeningParen, lastMultiComment, lastMultiCommentEndBrace,
        chunks = [], emitFrom = 0,
        parserCurrentIndex, currentChunkStartIndex, cc, cc2, matched;

    function fail(msg, index) {
        throw new(LessError)(parser, {
            index: index || parserCurrentIndex,
            type: 'Parse',
            message: msg,
            filename: env.currentFileInfo.filename
        }, env);
    }

    function emitChunk(force) {
        var len = parserCurrentIndex - emitFrom;
        if (((len < 512) && !force) || !len) {
            return;
        }
        chunks.push(input.slice(emitFrom, parserCurrentIndex + 1));
        emitFrom = parserCurrentIndex + 1;
    }

    for (parserCurrentIndex = 0; parserCurrentIndex < len; parserCurrentIndex++) {
        cc = input.charCodeAt(parserCurrentIndex);
        if (((cc >= 97) && (cc <= 122)) || (cc < 34)) {
            // a-z or whitespace
            continue;
        }

        switch (cc) {
            case 40:                        // (
                parenLevel++;
                lastOpeningParen = parserCurrentIndex;
                continue;
            case 41:                        // )
                if (--parenLevel < 0) {
                    return fail("missing opening `(`");
                }
                continue;
            case 59:                        // ;
                if (!parenLevel) { emitChunk(); }
                continue;
            case 123:                       // {
                level++;
                lastOpening = parserCurrentIndex;
                continue;
            case 125:                       // }
                if (--level < 0) {
                    return fail("missing opening `{`");
                }
                if (!level && !parenLevel) { emitChunk(); }
                continue;
            case 92:                        // \
                if (parserCurrentIndex < len - 1) { parserCurrentIndex++; continue; }
                return fail("unescaped `\\`");
            case 34:
            case 39:
            case 96:                        // ", ' and `
                matched = 0;
                currentChunkStartIndex = parserCurrentIndex;
                for (parserCurrentIndex = parserCurrentIndex + 1; parserCurrentIndex < len; parserCurrentIndex++) {
                    cc2 = input.charCodeAt(parserCurrentIndex);
                    if (cc2 > 96) { continue; }
                    if (cc2 == cc) { matched = 1; break; }
                    if (cc2 == 92) {        // \
                        if (parserCurrentIndex == len - 1) {
                            return fail("unescaped `\\`");
                        }
                        parserCurrentIndex++;
                    }
                }
                if (matched) { continue; }
                return fail("unmatched `" + String.fromCharCode(cc) + "`", currentChunkStartIndex);
            case 47:                        // /, check for comment
                if (parenLevel || (parserCurrentIndex == len - 1)) { continue; }
                cc2 = input.charCodeAt(parserCurrentIndex + 1);
                if (cc2 == 47) {
                    // //, find lnfeed
                    for (parserCurrentIndex = parserCurrentIndex + 2; parserCurrentIndex < len; parserCurrentIndex++) {
                        cc2 = input.charCodeAt(parserCurrentIndex);
                        if ((cc2 <= 13) && ((cc2 == 10) || (cc2 == 13))) { break; }
                    }
                } else if (cc2 == 42) {
                    // /*, find */
                    lastMultiComment = currentChunkStartIndex = parserCurrentIndex;
                    for (parserCurrentIndex = parserCurrentIndex + 2; parserCurrentIndex < len - 1; parserCurrentIndex++) {
                        cc2 = input.charCodeAt(parserCurrentIndex);
                        if (cc2 == 125) { lastMultiCommentEndBrace = parserCurrentIndex; }
                        if (cc2 != 42) { continue; }
                        if (input.charCodeAt(parserCurrentIndex + 1) == 47) { break; }
                    }
                    if (parserCurrentIndex == len - 1) {
                        return fail("missing closing `*/`", currentChunkStartIndex);
                    }
                    parserCurrentIndex++;
                }
                continue;
            case 42:                       // *, check for unmatched */
                if ((parserCurrentIndex < len - 1) && (input.charCodeAt(parserCurrentIndex + 1) == 47)) {
                    return fail("unmatched `/*`");
                }
                continue;
        }
    }

    if (level !== 0) {
        if ((lastMultiComment > lastOpening) && (lastMultiCommentEndBrace > lastMultiComment)) {
            return fail("missing closing `}` or `*/`", lastOpening);
        } else {
            return fail("missing closing `}`", lastOpening);
        }
    } else if (parenLevel !== 0) {
        return fail("missing closing `)`", lastOpeningParen);
    }

    emitChunk(true);
    return chunks;
};