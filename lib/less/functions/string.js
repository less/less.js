import Quoted from "../tree/quoted";
import Anonymous from "../tree/anonymous";
import JavaScript from "../tree/javascript";
import functionRegistry from "./function-registry";

functionRegistry.addMultiple({
    e(str) {
        return new Anonymous(str instanceof JavaScript ? str.evaluated : str.value);
    },
    escape(str) {
        return new Anonymous(
            encodeURI(str.value).replace(/=/g, "%3D").replace(/:/g, "%3A").replace(/#/g, "%23").replace(/;/g, "%3B")
                .replace(/\(/g, "%28").replace(/\)/g, "%29"));
    },
    replace(string, pattern, replacement, flags) {
        let result = string.value;
        replacement = (replacement.type === "Quoted") ?
            replacement.value : replacement.toCSS();
        result = result.replace(new RegExp(pattern.value, flags ? flags.value : ''), replacement);
        return new Quoted(string.quote || '', result, string.escaped);
    },
    '%'(string, ...args) {
        let result = string.value;

        for (let i = 0; i < args.length; i++) {
            /* jshint loopfunc:true */
            result = result.replace(/%[sda]/i, token => {
                const value = ((args[i].type === "Quoted") &&
                    token.match(/s/i)) ? args[i].value : args[i].toCSS();
                return token.match(/[A-Z]$/) ? encodeURIComponent(value) : value;
            });
        }
        result = result.replace(/%%/g, '%');
        return new Quoted(string.quote || '', result, string.escaped);
    }
});
