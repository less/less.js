import Node, { IProps, INodeOptions, ILocationInfo} from '../node'
import NumericNode from '../numeric-node'
import { fround } from '../util'
import { type } from 'os'

/**
 * @todo move keywords to CST-to-AST stage
 */
// import colors from '../data/colors'

enum ColorFormat {
  HEX,
  RGB,
  HSL
}

type IColorOptions = {
  colorFormat?: ColorFormat
}

/**
 * Can be a string?
 */
class Color extends NumericNode {
  /** RGBA values */
  value: [number, number, number, number]
  options: IColorOptions

  constructor(props: IProps, options: IColorOptions = {}, location?: ILocationInfo) {
    if (options.colorFormat === undefined) {
      options.colorFormat = ColorFormat.HEX
    }
    super(props, options, location)
    let text = this.text

    if (this.value === undefined && text !== undefined) {
      const value = []

      if (text.charAt(0) !== '#') {
        throw new Error(`Only hex string values can be converted to colors.`)
      }
      text = text.slice(1)

      if (text.length >= 6) {
        text.match(/.{2}/g).map((c, i) => {
          if (i < 3) {
            value.push(parseInt(c, 16))
          } else {
            value.push(parseInt(c, 16) / 255)
          }
        })
      } else {
        text.split('').map((c, i) => {
          if (i < 3) {
            value.push(parseInt(c + c, 16))
          } else {
            value.push(parseInt(c + c, 16) / 255)
          }
        })
      }
      /** Make sure an alpha value is present */
      if (value.length === 3) {
        value.push(1)
      }
    }
  }

  luma() {
    let r = this.value[0] / 255
    let g = this.value[1] / 255
    let b = this.value[2] / 255

    r = (r <= 0.03928) ? r / 12.92 : Math.pow(((r + 0.055) / 1.055), 2.4)
    g = (g <= 0.03928) ? g / 12.92 : Math.pow(((g + 0.055) / 1.055), 2.4)
    b = (b <= 0.03928) ? b / 12.92 : Math.pow(((b + 0.055) / 1.055), 2.4)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  toString() {
    let color: any
    let args = []

    if (this.text) {
      return this.text
    }

    let colorFormat = this.options.colorFormat
    const alpha = fround(this.value[3])
    const rgb = this.value.slice(0, 3)

    if (alpha !== 1 && colorFormat === ColorFormat.HEX) {
      colorFormat = ColorFormat.RGB
    }
    let colorFunction: string

    switch (colorFormat) {
      case ColorFormat.RGB:
        args = rgb.map(c => clamp(Math.round(c), 255))
        if (alpha === 1) {
          colorFunction = 'rgb'
        } else {
          colorFunction = 'rgba'
          args = args.concat(clamp(alpha, 1))
        }
        break
      case ColorFormat.HSL:
        color = this.toHSL()
        args = [
          fround(color.h),
          `${fround(color.s * 100)}%`,
          `${fround(color.l * 100)}%`
        ]
        if (alpha === 1) {
          colorFunction = 'hsl'
        } else {
          colorFunction = 'hsla'
          args = args.concat(clamp(alpha, 1))
        }
    }

    if (colorFunction) {
      // Values are capped between `0` and `255`, rounded and zero-padded.
      return `${colorFunction}(${args.join(`, `)})`;
    }

    color = toHex(rgb)
    return color
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

    // compare(x) {
    //     return (x.rgb &&
    //         x.rgb[0] === this.rgb[0] &&
    //         x.rgb[1] === this.rgb[1] &&
    //         x.rgb[2] === this.rgb[2] &&
    //         x.alpha  === this.alpha) ? 0 : undefined;
    // }
}

Color.prototype.type = 'Color';

function clamp(v, max) {
  return Math.min(Math.max(v, 0), max)
}

function toHex(v: number[]) {
  return `#${v.map(c => {
    c = clamp(Math.round(c), 255);
    return (c < 16 ? '0' : '') + c.toString(16)
  }).join('')}`
}

export default Color;
