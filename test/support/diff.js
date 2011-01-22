/**
 * Fragment used to represent a string fragment in the diff.
 */
var Fragment = function (string) {
    this.content = string;
    this.equiv = false;
};

/**
 * Wrap in given tag or return the clean value.
 */
Fragment.prototype.toString = function (tag) {
    if (this.equiv || !tag) {
        return this.content;
    }
    else {
        return '<' + tag + '>' + this.content + '</' + tag + '>';
    }
};

var moveToEnd = function (a, i, k) {
    if (!a.equiv && (!k[i-1] || k[i-1].equiv)) {
        // Find next item equiv item.
        for (var j = i+1; k[j] && !k[j].equiv; j++);
        if (k[j] && k[j].content === a.content) {
            k[i] = k[j];
            k[j] = a;
        }
    }
};

var aggregate = function (a, i, k) {
    if (!a.equiv && k[i+1] && !k[i+1].equiv) {
        k[i+1].content = a.content + k[i+1].content;
        delete k[i];
    }
};

var join = function (what, t) {
    return what.map(function (a) {
        if (a) return a.toString(t);
    }).join('');
};

var clone = function(source) {
    if (typeof source === 'object' && source !== null) {
        var target = Array.isArray(source) ? [] : {};
        for (var key in source) target[key] = clone(source[key]);
        return target;
    }
    return source;
};

var WordDiff = {
    nonWord: /(&.+?;|[\u0000-\u0040\u005B-\u0060\u007B-\u00A9\u00AB-\u00B4\u00B6-\u00B9\u00BB-\u00BF\u00D7\u00F7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u036F\u0375\u037E\u0384\u0385\u0387\u03F6\u0482-\u0489\u055A-\u055F\u0589\u058A\u0591-\u05C7\u05F3\u05F4\u0600-\u0603\u0606-\u061B\u061E\u061F\u064B-\u065E\u0660-\u066D\u0670\u06D4\u06D6-\u06E4\u06EA-\u06ED\u06F0-\u06F9\u06FD\u06FE\u0700-\u070D\u070F\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07F6-\u07F9\u0901-\u0903\u093C\u093E-\u094D\u0951-\u0954\u09E2\u0962-\u0970\u06E7-\u06E9\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E3\u09E6-\u09EF\u09F2-\u09FA\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AF1\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B66-\u0B70\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BFA\u0C01-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C78-\u0C7F\u0C82\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D75\u0D79\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2-\u0DF4\u0E31\u0E34-\u0E3A\u0E3F\u0E47-\u0E5B\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0ED0-\u0ED9\u0F01-\u0F3F\u0F71-\u0F87\u0F90-\u0F97\u0F99-\u0FBC\u0FBE-\u0FCC\u0FCE-\u0FD4\u102B-\u103E\u1040-\u104F\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u1099\u109E\u109F\u10FB\u135F-\u137C\u1390-\u1399\u166D\u166E\u1680\u169B\u169C\u16EB-\u16F0\u1712-\u1714\u1732-\u1736\u1752\u1753\u1772\u1773\u17B4-\u17D6\u17D8-\u17DB\u17DD\u17E0-\u17E9\u17F0-\u17F9\u1800-\u180E\u1810-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1940\u1944-\u194F\u19B0-\u19C0\u19C8\u19C9\u19D0-\u19D9\u19DE-\u19FF\u1A17-\u1A1B\u1A1E\u1A1F\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B7C\u1B80-\u1B82\u1BA1-\u1BAA\u1BB0-\u1BB9\u1C24-\u1C37\u1C3B-\u1C49\u1C50-\u1C59\u1C7E\u1C7F\u1DC0-\u1DE6\u1DFE\u1DFF\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2000-\u2064\u206A-\u2070\u2074-\u207E\u2080-\u208E\u20A0-\u20B5\u20D0-\u20F0\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u2153-\u2182\u2185-\u2188\u2190-\u23E7\u2400-\u2426\u2440-\u244A\u2460-\u269D\u26A0-\u26BC\u26C0-\u26C3\u2701-\u2704\u2706-\u2709\u270C-\u2727\u2729-\u274B\u274D\u274F-\u2752\u2756\u2758-\u275E\u2761-\u2794\u2798-\u27AF\u27B1-\u27BE\u27C0-\u27CA\u27CC\u27D0-\u2B4C\u2B50-\u2B54\u2CE5-\u2CEA\u2CF9-\u2CFF\u2DE0-\u2E2E\u2E30\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u3004\u3007-\u3030\u3036-\u303A\u303D-\u303F\u3099-\u309C\u30A0\u30FB\u3190-\u319F\u31C0-\u31E3\u3200-\u321E\u3220-\u3243\u3250-\u32FE\u3300-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA60D-\uA60F\uA620-\uA629\uA66F-\uA673\uA67C-\uA67E\uA700-\uA716\uA720\uA721\uA789\uA78A\uA802\uA806\uA80B\uA823-\uA82B\uA874-\uA877\uA880\uA881\uA8B4-\uA8C4\uA8CE-\uA8D9\uA900-\uA909\uA926-\uA92F\uA947-\uA953\uA95F\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA5C-\uAA5F\uD800\uDB7F\uDB80\uDBFF\uDC00\uDFFF\uE000\uF8FF\uFB1E\uFB29\uFD3E\uFD3F\uFDFC\uFDFD\uFE00-\uFE19\uFE20-\uFE26\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFEFF\uFF01-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFF9-\uFFFD])/,

    tokenize: function (args) {
        // Split on non-word characters.
        for (var type in args) {
            args[type] = args[type].split(WordDiff.nonWord).filter(function (s) {
                return s.length;
            });
        }

        // Calculate the indexes and offsets for common suffixes and prefixes.
        var i = -1, j = args.del.length, k = args.ins.length;
        while (args.del[++i] === args.ins[i] && i <= j);
        while (j >= i && k >= i && args.del[--j] === args.ins[--k]);

        args.prefix = args.del.slice(0, i).join('');
        args.suffix = args.del.slice(j + 1).join('');
        args.del = args.del.slice(i, ++j);
        args.ins = args.ins.slice(i, ++k);
    },

    lcs: function (args) {
        var matrix = [];

        for (var i = 0; i < args.del.length; i++) {
            matrix[i] = [];
            for (var j = 0; j < args.ins.length; j++) {
                if (args.del[i] === args.ins[j]) {
                    matrix[i][j] = (matrix[i - 1] && matrix[i - 1][j - 1] || 0) + args.del[i].length;
                }
                else {
                    matrix[i][j] = Math.max(matrix[i][j - 1] || 0, matrix[i - 1] && matrix[i - 1][j] || 0);
                }
            }
        }

        return matrix;
    },

    changeset: function (args, matrix) {
        var result = {};

        ['del', 'ins'].forEach(function (type) {
            result[type] = args[type].map(function (a) { return new Fragment(a); });
        });

        // Backtrack through the matrix.
        for (var i = result.del.length - 1, j = result.ins.length - 1; i >= 0; i--, j--) {
            if (j < 0 || result.del[i].content !== result.ins[j].content) {
                if (j < 0 || (j > 0 && matrix[i - 1] && (matrix[i][j - 1] < matrix[i - 1][j]))) {
                    j++;
                }
                else {
                    i++;
                }
            }
            else {
                result.del[i] = result.ins[j];
                result.del[i].equiv = true;
            }
        }

        // Fill up gaps.
        for (var i = 0; i < result.del.length; i++) {
            if (result.del[i].equiv && result.del[i].content.length < 3) {
                var j = result.ins.indexOf(result.del[i]);
                if (result.del[i-1] && result.del[i+1] && result.ins[j-1] && result.ins[j+1] && !result.del[i-1].equiv && !result.del[i+1].equiv && !result.ins[j-1].equiv && !result.ins[j+1].equiv){
                    result.del[i].equiv = false;
                    result.ins[j] = clone(result.del[i]);
                }
            }
        }

        ['del', 'ins'].forEach(function (type) {
            // Try to move changes to the end.
            for (var i = 0; i < result[type].length; i++)
                moveToEnd(result[type][i], i, result[type]);

            // Aggregate subsequent changes to minimize ins/del tags.
            for (var i = 0; i < result[type].length; i++)
                aggregate(result[type][i], i, result[type]);
        });

        return result;
    },

    htmlRender: function (args, result) {
        var diff = {
            del: args.prefix + join(result.del, 'del') + args.suffix,
            ins: args.prefix + join(result.ins, 'ins') + args.suffix
        };

        return diff;
    },

    htmlDiff: function (del, ins) {
        var args = { 'del': del, 'ins': ins };

        WordDiff.tokenize(args);
        var matrix = WordDiff.lcs(args);
        var result = WordDiff.changeset(args, matrix);
        return WordDiff.htmlRender(args, result);
    },

    render: function (args, result) {
        var join = function (what, type) {
            return what.map(function (a) {
                if (!a) return;
                if (a.equiv) return a.content;
                if (type == 'del') return '\033[31;4m' + a.content + '\033[0m';
                if (type == 'ins') return '\033[32;4m' + a.content + '\033[0m';
            }).join('');
        };

        return {
            del: args.prefix + join(result.del, 'del') + args.suffix,
            ins: args.prefix + join(result.ins, 'ins') + args.suffix
        };
    },

    diff: function(del, ins) {
        var args = { 'del': del, 'ins': ins };

        WordDiff.tokenize(args);
        var matrix = WordDiff.lcs(args);
        var result = WordDiff.changeset(args, matrix);
        return WordDiff.render(args, result);
    }
};

module.exports = WordDiff;
