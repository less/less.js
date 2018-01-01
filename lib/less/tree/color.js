import Node from "./node";
import colors from "../data/colors";

//
// RGB Colors - #ff0014, #eee
//
export default class Color extends Node {
    constructor(rgb, a, originalForm) {
        super();
        //
        // The end goal here, is to parse the arguments
        // into an integer triplet, such as `128, 255, 0`
        //
        // This facilitates operations and conversions.
        //
        if (Array.isArray(rgb)) {
            this.rgb = rgb;
        } else if (rgb.length == 6) {
            this.rgb = rgb.match(/.{2}/g).map(c => parseInt(c, 16));
        } else {
            this.rgb = rgb.split('').map(c => parseInt(c + c, 16));
        }
        this.alpha = typeof a === 'number' ? a : 1;
        if (typeof originalForm !== 'undefined') {
            this.value = originalForm;
        }
    }

    luma() {
        let r = this.rgb[0] / 255;
        let g = this.rgb[1] / 255;
        let b = this.rgb[2] / 255;

        r = (r <= 0.03928) ? r / 12.92 : (r + 0.055) / 1.055 ** 2.4;
        g = (g <= 0.03928) ? g / 12.92 : (g + 0.055) / 1.055 ** 2.4;
        b = (b <= 0.03928) ? b / 12.92 : (b + 0.055) / 1.055 ** 2.4;

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    genCSS(context, output) {
        output.add(this.toCSS(context));
    }

    toCSS(context, doNotCompress) {
        const compress = context && context.compress && !doNotCompress;
        let color;

        // `value` is set if this color was originally
        // converted from a named color string so we need
        // to respect this and try to output named color too.
        if (this.value) {
            return this.value;
        }

        // If we have some transparency, the only way to represent it
        // is via `rgba`. Otherwise, we use the hex representation,
        // which has better compatibility with older browsers.
        // Values are capped between `0` and `255`, rounded and zero-padded.
        const alpha = this.fround(context, this.alpha);
        if (alpha < 1) {
            return 'rgba(' + this.rgb
                .map(c => clamp(Math.round(c), 255))
                .concat(clamp(alpha, 1))
                .join(',' + compress ? '' : ' ') + ')';
        }

        color = this.toRGB();

        if (compress) {
            const splitcolor = color.split('');

            // Convert color to short format
            if (splitcolor[1] === splitcolor[2] && splitcolor[3] === splitcolor[4] && splitcolor[5] === splitcolor[6]) {
                color = `#${splitcolor[1]}${splitcolor[3]}${splitcolor[5]}`;
            }
        }

        return color;
    }

    //
    // Operations have to be done per-channel, if not,
    // channels will spill onto each other. Once we have
    // our result, in the form of an integer triplet,
    // we create a new Color node to hold the result.
    //
    operate(context, op, other) {
        const rgb = new Array(3);
        const alpha = this.alpha * (1 - other.alpha) + other.alpha;
        for (let c = 0; c < 3; c++) {
            rgb[c] = this._operate(context, op, this.rgb[c], other.rgb[c]);
        }
        return new Color(rgb, alpha);
    }

    toRGB() {
        return toHex(this.rgb);
    }

    toHSL() {
        const r = this.rgb[0] / 255;
        const g = this.rgb[1] / 255;
        const b = this.rgb[2] / 255;
        const a = this.alpha;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h;
        let s;
        const l = (max + min) / 2;
        const d = max - min;

        if (max === min) {
            h = s = 0;
        } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2;               break;
                case b: h = (r - g) / d + 4;               break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l, a };
    }

    // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    toHSV() {
        const r = this.rgb[0] / 255;
        const g = this.rgb[1] / 255;
        const b = this.rgb[2] / 255;
        const a = this.alpha;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h;
        let s;
        const v = max;

        const d = max - min;
        if (max === 0) {
            s = 0;
        } else {
            s = d / max;
        }

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s, v, a };
    }

    toARGB() {
        return toHex([this.alpha * 255].concat(this.rgb));
    }

    compare(x) {
        return (x.rgb &&
            x.rgb[0] === this.rgb[0] &&
            x.rgb[1] === this.rgb[1] &&
            x.rgb[2] === this.rgb[2] &&
            x.alpha  === this.alpha) ? 0 : undefined;
    }
    static fromKeyword(keyword) {
        let c;
        const key = keyword.toLowerCase();
        if (colors.hasOwnProperty(key)) {
            c = new Color(colors[key].slice(1));
        }
        else if (key === "transparent") {
            c = new Color([0, 0, 0], 0);
        }
    
        if (c) {
            c.value = keyword;
            return c;
        }
    };
}

Color.prototype.type = "Color";

function clamp(v, max) {
    return Math.min(Math.max(v, 0), max);
}

function toHex(v) {
    return '#' + v.map(c => {
        c = clamp(Math.round(c), 255);
        return (c < 16 ? '0' : '') + c.toString(16);
    }).join('');
}
