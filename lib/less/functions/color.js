import Dimension from "../tree/dimension";
import Color from "../tree/color";
import Quoted from "../tree/quoted";
import Anonymous from "../tree/anonymous";
import functionRegistry from "./function-registry";

function clamp(val) {
    return Math.min(1, Math.max(0, val));
}
function hsla(color) {
    // eslint-disable-next-line no-use-before-define
    return colorFunctions.hsla(color.h, color.s, color.l, color.a);
}
function number(n) {
    if (n instanceof Dimension) {
        return parseFloat(n.unit.is('%') ? n.value / 100 : n.value);
    } else if (typeof n === 'number') {
        return n;
    } else {
        throw {
            type: "Argument",
            message: "color functions take numbers as parameters"
        };
    }
}
function scaled(n, size) {
    if (n instanceof Dimension && n.unit.is('%')) {
        return parseFloat(n.value * size / 100);
    } else {
        return number(n);
    }
}
const colorFunctions = {
    rgb(r, g, b) {
        return colorFunctions.rgba(r, g, b, 1.0);
    },
    rgba(r, g, b, a) {
        const rgb = [r, g, b].map(c => scaled(c, 255));
        a = number(a);
        return new Color(rgb, a);
    },
    hsl(h, s, l) {
        return colorFunctions.hsla(h, s, l, 1.0);
    },
    hsla(h, s, l, a) {
        s = clamp(number(s)); l = clamp(number(l)); a = clamp(number(a));
        const m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        const m1 = l * 2 - m2;
        function hue(h) {
            h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
            if (h * 6 < 1) {
                return m1 + (m2 - m1) * h * 6;
            }
            else if (h * 2 < 1) {
                return m2;
            }
            else if (h * 3 < 2) {
                return m1 + (m2 - m1) * (2 / 3 - h) * 6;
            }
            else {
                return m1;
            }
        }

        h = (number(h) % 360) / 360;
        return colorFunctions.rgba(hue(h + 1 / 3) * 255,
            hue(h)       * 255,
            hue(h - 1 / 3) * 255,
            a);
    },

    hsv(h, s, v) {
        return colorFunctions.hsva(h, s, v, 1.0);
    },

    hsva(h, s, v, a) {
        h = ((number(h) % 360) / 360) * 360;
        s = number(s); v = number(v); a = number(a);

        const i = Math.floor((h / 60) % 6);
        const f = (h / 60) - i;

        const vs = [v,
            v * (1 - s),
            v * (1 - f * s),
            v * (1 - (1 - f) * s)];
        const perm = [[0, 3, 1],
            [2, 0, 1],
            [1, 0, 3],
            [1, 2, 0],
            [3, 1, 0],
            [0, 1, 2]];

        return colorFunctions.rgba(vs[perm[i][0]] * 255,
            vs[perm[i][1]] * 255,
            vs[perm[i][2]] * 255,
            a);
    },

    hue(color) {
        return new Dimension(color.toHSL().h);
    },
    saturation(color) {
        return new Dimension(color.toHSL().s * 100, '%');
    },
    lightness(color) {
        return new Dimension(color.toHSL().l * 100, '%');
    },
    hsvhue(color) {
        return new Dimension(color.toHSV().h);
    },
    hsvsaturation(color) {
        return new Dimension(color.toHSV().s * 100, '%');
    },
    hsvvalue(color) {
        return new Dimension(color.toHSV().v * 100, '%');
    },
    red(color) {
        return new Dimension(color.rgb[0]);
    },
    green(color) {
        return new Dimension(color.rgb[1]);
    },
    blue(color) {
        return new Dimension(color.rgb[2]);
    },
    alpha(color) {
        return new Dimension(color.toHSL().a);
    },
    luma(color) {
        return new Dimension(color.luma() * color.alpha * 100, '%');
    },
    luminance(color) {
        const luminance =
            (0.2126 * color.rgb[0] / 255) +
                (0.7152 * color.rgb[1] / 255) +
                (0.0722 * color.rgb[2] / 255);

        return new Dimension(luminance * color.alpha * 100, '%');
    },
    saturate(color, amount, method) {
        // filter: saturate(3.2);
        // should be kept as is, so check for color
        if (!color.rgb) {
            return null;
        }
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s +=  hsl.s * amount.value / 100;
        }
        else {
            hsl.s += amount.value / 100;
        }
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    desaturate(color, amount, method) {
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s -=  hsl.s * amount.value / 100;
        }
        else {
            hsl.s -= amount.value / 100;
        }
        hsl.s = clamp(hsl.s);
        return hsla(hsl);
    },
    lighten(color, amount, method) {
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l +=  hsl.l * amount.value / 100;
        }
        else {
            hsl.l += amount.value / 100;
        }
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    darken(color, amount, method) {
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l -=  hsl.l * amount.value / 100;
        }
        else {
            hsl.l -= amount.value / 100;
        }
        hsl.l = clamp(hsl.l);
        return hsla(hsl);
    },
    fadein(color, amount, method) {
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a +=  hsl.a * amount.value / 100;
        }
        else {
            hsl.a += amount.value / 100;
        }
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    fadeout(color, amount, method) {
        const hsl = color.toHSL();

        if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a -=  hsl.a * amount.value / 100;
        }
        else {
            hsl.a -= amount.value / 100;
        }
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    fade(color, amount) {
        const hsl = color.toHSL();

        hsl.a = amount.value / 100;
        hsl.a = clamp(hsl.a);
        return hsla(hsl);
    },
    spin(color, amount) {
        const hsl = color.toHSL();
        const hue = (hsl.h + amount.value) % 360;

        hsl.h = hue < 0 ? 360 + hue : hue;

        return hsla(hsl);
    },
    //
    // Copyright (c) 2006-2009 Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein
    // http://sass-lang.com
    //
    mix(color1, color2, weight) {
        if (!color1.toHSL || !color2.toHSL) {
            console.log(color2.type);
            console.dir(color2);
        }
        if (!weight) {
            weight = new Dimension(50);
        }
        const p = weight.value / 100.0;
        const w = p * 2 - 1;
        const a = color1.toHSL().a - color2.toHSL().a;

        const w1 = (((w * a == -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
        const w2 = 1 - w1;

        const rgb = [color1.rgb[0] * w1 + color2.rgb[0] * w2,
            color1.rgb[1] * w1 + color2.rgb[1] * w2,
            color1.rgb[2] * w1 + color2.rgb[2] * w2];

        const alpha = color1.alpha * p + color2.alpha * (1 - p);

        return new Color(rgb, alpha);
    },
    greyscale(color) {
        return colorFunctions.desaturate(color, new Dimension(100));
    },
    contrast(color, dark, light, threshold) {
        // filter: contrast(3.2);
        // should be kept as is, so check for color
        if (!color.rgb) {
            return null;
        }
        if (typeof light === 'undefined') {
            light = colorFunctions.rgba(255, 255, 255, 1.0);
        }
        if (typeof dark === 'undefined') {
            dark = colorFunctions.rgba(0, 0, 0, 1.0);
        }
        // Figure out which is actually light and dark:
        if (dark.luma() > light.luma()) {
            const t = light;
            light = dark;
            dark = t;
        }
        if (typeof threshold === 'undefined') {
            threshold = 0.43;
        } else {
            threshold = number(threshold);
        }
        if (color.luma() < threshold) {
            return light;
        } else {
            return dark;
        }
    },
    // Changes made in 2.7.0 - Reverted in 3.0.0
    // contrast: function (color, color1, color2, threshold) {
    //     // Return which of `color1` and `color2` has the greatest contrast with `color`
    //     // according to the standard WCAG contrast ratio calculation.
    //     // http://www.w3.org/TR/WCAG20/#contrast-ratiodef
    //     // The threshold param is no longer used, in line with SASS.
    //     // filter: contrast(3.2);
    //     // should be kept as is, so check for color
    //     if (!color.rgb) {
    //         return null;
    //     }
    //     if (typeof color1 === 'undefined') {
    //         color1 = colorFunctions.rgba(0, 0, 0, 1.0);
    //     }
    //     if (typeof color2 === 'undefined') {
    //         color2 = colorFunctions.rgba(255, 255, 255, 1.0);
    //     }
    //     var contrast1, contrast2;
    //     var luma = color.luma();
    //     var luma1 = color1.luma();
    //     var luma2 = color2.luma();
    //     // Calculate contrast ratios for each color
    //     if (luma > luma1) {
    //         contrast1 = (luma + 0.05) / (luma1 + 0.05);
    //     } else {
    //         contrast1 = (luma1 + 0.05) / (luma + 0.05);
    //     }
    //     if (luma > luma2) {
    //         contrast2 = (luma + 0.05) / (luma2 + 0.05);
    //     } else {
    //         contrast2 = (luma2 + 0.05) / (luma + 0.05);
    //     }
    //     if (contrast1 > contrast2) {
    //         return color1;
    //     } else {
    //         return color2;
    //     }
    // },
    argb(color) {
        return new Anonymous(color.toARGB());
    },
    color(c) {
        if ((c instanceof Quoted) &&
            (/^#([a-f0-9]{6}|[a-f0-9]{3})$/i.test(c.value))) {
            return new Color(c.value.slice(1));
        }
        if ((c instanceof Color) || (c = Color.fromKeyword(c.value))) {
            c.value = undefined;
            return c;
        }
        throw {
            type:    "Argument",
            message: "argument must be a color keyword or 3/6 digit hex e.g. #FFF"
        };
    },
    tint(color, amount) {
        return colorFunctions.mix(colorFunctions.rgb(255, 255, 255), color, amount);
    },
    shade(color, amount) {
        return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color, amount);
    }
};
functionRegistry.addMultiple(colorFunctions);
