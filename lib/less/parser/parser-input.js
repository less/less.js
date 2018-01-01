var chunker = require('./chunker');

export default function () {
    let input,       // Less input string
        j,            // current chunk
        furthest,    // furthest index the parser has gone to
        furthestPossibleErrorMessage, // if this is furthest we got to, this is the probably cause
        chunks,      // chunkified input
        current,     // current chunk
        currentPos;  // index of current chunk, in `input`
    const saveStack = [];   // holds state for backtracking
    const parserInput = {};

    const CHARCODE_SPACE = 32,
        CHARCODE_TAB = 9,
        CHARCODE_LF = 10,
        CHARCODE_CR = 13,
        CHARCODE_PLUS = 43,
        CHARCODE_COMMA = 44,
        CHARCODE_FORWARD_SLASH = 47,
        CHARCODE_9 = 57;

    function skipWhitespace(length) {
        const oldi = parserInput.i;
        const oldj = j;
        const curr = parserInput.i - currentPos;
        const endIndex = parserInput.i + current.length - curr;
        const mem = (parserInput.i += length);
        const inp = input;
        let c;
        let nextChar;
        let comment;

        for (; parserInput.i < endIndex; parserInput.i++) {
            c = inp.charCodeAt(parserInput.i);

            if (parserInput.autoCommentAbsorb && c === CHARCODE_FORWARD_SLASH) {
                nextChar = inp.charAt(parserInput.i + 1);
                if (nextChar === '/') {
                    comment = {index: parserInput.i, isLineComment: true};
                    let nextNewLine = inp.indexOf("\n", parserInput.i + 2);
                    if (nextNewLine < 0) {
                        nextNewLine = endIndex;
                    }
                    parserInput.i = nextNewLine;
                    comment.text = inp.substr(comment.index, parserInput.i - comment.index);
                    parserInput.commentStore.push(comment);
                    continue;
                } else if (nextChar === '*') {
                    const nextStarSlash = inp.indexOf("*/", parserInput.i + 2);
                    if (nextStarSlash >= 0) {
                        comment = {
                            index: parserInput.i,
                            text: inp.substr(parserInput.i, nextStarSlash + 2 - parserInput.i),
                            isLineComment: false
                        };
                        parserInput.i += comment.text.length - 1;
                        parserInput.commentStore.push(comment);
                        continue;
                    }
                }
                break;
            }

            if ((c !== CHARCODE_SPACE) && (c !== CHARCODE_LF) && (c !== CHARCODE_TAB) && (c !== CHARCODE_CR)) {
                break;
            }
        }

        current = current.slice(length + parserInput.i - mem + curr);
        currentPos = parserInput.i;

        if (!current.length) {
            if (j < chunks.length - 1) {
                current = chunks[++j];
                skipWhitespace(0); // skip space at the beginning of a chunk
                return true; // things changed
            }
            parserInput.finished = true;
        }

        return oldi !== parserInput.i || oldj !== j;
    }

    parserInput.save = () => {
        currentPos = parserInput.i;
        saveStack.push( { current, i: parserInput.i, j });
    };
    parserInput.restore = possibleErrorMessage => {
        if (parserInput.i > furthest || (parserInput.i === furthest && possibleErrorMessage && !furthestPossibleErrorMessage)) {
            furthest = parserInput.i;
            furthestPossibleErrorMessage = possibleErrorMessage;
        }
        const state = saveStack.pop();
        current = state.current;
        currentPos = parserInput.i = state.i;
        j = state.j;
    };
    parserInput.forget = () => {
        saveStack.pop();
    };
    parserInput.isWhitespace = offset => {
        const pos = parserInput.i + (offset || 0);
        const code = input.charCodeAt(pos);
        return (code === CHARCODE_SPACE || code === CHARCODE_CR || code === CHARCODE_TAB || code === CHARCODE_LF);
    };

    // Specialization of $(tok)
    parserInput.$re = tok => {
        if (parserInput.i > currentPos) {
            current = current.slice(parserInput.i - currentPos);
            currentPos = parserInput.i;
        }

        const m = tok.exec(current);
        if (!m) {
            return null;
        }

        skipWhitespace(m[0].length);
        if (typeof m === "string") {
            return m;
        }

        return m.length === 1 ? m[0] : m;
    };

    parserInput.$char = tok => {
        if (input.charAt(parserInput.i) !== tok) {
            return null;
        }
        skipWhitespace(1);
        return tok;
    };

    parserInput.$str = tok => {
        const tokLength = tok.length;

        // https://jsperf.com/string-startswith/21
        for (let i = 0; i < tokLength; i++) {
            if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
                return null;
            }
        }

        skipWhitespace(tokLength);
        return tok;
    };

    parserInput.$quoted = () => {
        const startChar = input.charAt(parserInput.i);
        if (startChar !== "'" && startChar !== '"') {
            return;
        }
        const length = input.length;
        const currentPosition = parserInput.i;

        for (let i = 1; i + currentPosition < length; i++) {
            const nextChar = input.charAt(i + currentPosition);
            switch (nextChar) {
                case "\\":
                    i++;
                    continue;
                case "\r":
                case "\n":
                    break;
                case startChar:
                    const str = input.substr(currentPosition, i + 1);
                    skipWhitespace(i + 1);
                    return str;
                default:
            }
        }
        return null;
    };

    parserInput.autoCommentAbsorb = true;
    parserInput.commentStore = [];
    parserInput.finished = false;

    // Same as $(), but don't change the state of the parser,
    // just return the match.
    parserInput.peek = tok => {
        if (typeof tok === 'string') {
            // https://jsperf.com/string-startswith/21
            for (let i = 0; i < tok.length; i++) {
                if (input.charAt(parserInput.i + i) !== tok.charAt(i)) {
                    return false;
                }
            }
            return true;
        } else {
            return tok.test(current);
        }
    };

    // Specialization of peek()
    // TODO remove or change some currentChar calls to peekChar
    parserInput.peekChar = tok => input.charAt(parserInput.i) === tok;

    parserInput.currentChar = () => input.charAt(parserInput.i);

    parserInput.getInput = () => input;

    parserInput.peekNotNumeric = () => {
        const c = input.charCodeAt(parserInput.i);
        // Is the first char of the dimension 0-9, '.', '+' or '-'
        return (c > CHARCODE_9 || c < CHARCODE_PLUS) || c === CHARCODE_FORWARD_SLASH || c === CHARCODE_COMMA;
    };

    parserInput.start = (str, chunkInput, failFunction) => {
        input = str;
        parserInput.i = j = currentPos = furthest = 0;

        // chunking apparently makes things quicker (but my tests indicate
        // it might actually make things slower in node at least)
        // and it is a non-perfect parse - it can't recognise
        // unquoted urls, meaning it can't distinguish comments
        // meaning comments with quotes or {}() in them get 'counted'
        // and then lead to parse errors.
        // In addition if the chunking chunks in the wrong place we might
        // not be able to parse a parser statement in one go
        // this is officially deprecated but can be switched on via an option
        // in the case it causes too much performance issues.
        if (chunkInput) {
            chunks = chunker(str, failFunction);
        } else {
            chunks = [str];
        }

        current = chunks[0];

        skipWhitespace(0);
    };

    parserInput.end = () => {
        let message;
        const isFinished = parserInput.i >= input.length;

        if (parserInput.i < furthest) {
            message = furthestPossibleErrorMessage;
            parserInput.i = furthest;
        }
        return {
            isFinished,
            furthest: parserInput.i,
            furthestPossibleErrorMessage: message,
            furthestReachedEnd: parserInput.i >= input.length - 1,
            furthestChar: input[parserInput.i]
        };
    };
    
    return parserInput;
};
