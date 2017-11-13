import functionRegistry from './function-registry'
import functionCaller from './function-caller'

// register functions
import "./boolean";
import "./default";
import "./color";
import "./color-blending";
import dataUri from "./data-uri";
import "./math";
import "./number";
import "./string";
import svg from "./svg";
import "./types";

export default function (environment) {
    const functions = {
        functionRegistry,
        functionCaller
    };

    // register functions
    dataUri(environment);
    svg(environment);

    return functions;
}
