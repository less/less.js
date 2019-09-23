import {
  Node,
  IProps,
  ILocationInfo,
  NumericNode,
  NumberValue
} from '.'

import { fround } from '../util/math'
import { EvalContext } from '../contexts'
import { operate } from '../util/math'

/**
 * @todo move keywords to CST-to-AST stage
 */
// import colors from '../data/colors'

export enum ColorFormat {
  HEX,
  RGB,
  HSL
}

export type IColorOptions = {
  colorFormat?: ColorFormat
}

export type IColorProps = string | number[] | IProps

/**
 * Can be a string?
 */
export class Color extends NumericNode {
  /** RGBA values */
  value: [number, number, number, number]
  options: IColorOptions

  constructor(props: IColorProps, options: IColorOptions = {}, location?: ILocationInfo) {
    if (options.colorFormat === undefined) {
      options.colorFormat = ColorFormat.HEX
    }
    let newProps: IProps
    if (Array.isArray(props)) {
      newProps = <IProps>{ value: props }
    } else if (props.constructor === String) {
      newProps = <IProps>{ text: props }
    } else {
      newProps = <IProps>props
    }

    const { value, text } = newProps

    if (value === undefined && text !== undefined) {
      const newValue: number[] = []

      if (text.charAt(0) !== '#') {
        throw new Error(`Only hex string values can be converted to colors.`)
      }
      const hex = text.slice(1)

      if (hex.length >= 6) {
        hex.match(/.{2}/g).map((c, i) => {
          if (i < 3) {
            newValue.push(parseInt(c, 16))
          } else {
            newValue.push(parseInt(c, 16) / 255)
          }
        })
      } else {
        hex.split('').map((c, i) => {
          if (i < 3) {
            newValue.push(parseInt(c + c, 16))
          } else {
            newValue.push(parseInt(c + c, 16) / 255)
          }
        })
      }
      /** Make sure an alpha value is present */
      if (newValue.length === 3) {
        newValue.push(1)
      }
      newProps.value = newValue
    }
    super(newProps, options, location)
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
    operate(op: string, other: Node, context?: EvalContext) {
      let otherVal: [number, number, number, number]
      if (other instanceof NumberValue) {
        const val = other.value
        otherVal = [val, val, val, 1]
      }
      if (!otherVal && !(other instanceof Color)) {
        return this.error(context,
          `Incompatible units. An operation can't be between a color and a non-number`
        )
      }
      
      if (other instanceof Color) {
        otherVal = other.value
      }
      
      const rgba = new Array(4)
      /**
       * @todo - Someone should document why this alpha result is logical for any math op
       *         It seems arbitrary at first glance, but maybe it's the best result?
      */
      const alpha = this.value[3] * (1 - other.value[3]) + other.value[3]
      for (let c = 0; c < 3; c++) {
        rgba[c] = operate(op, this.value[c], other.value[c])
      }
      rgba[3] = alpha
      return new Color({ value: rgba }, {...this.options}).inherit(this)
    }

    private hslObject() {
      const value = this.value
      const r = value[0] / 255
      const g = value[1] / 255
      const b = value[2] / 255
      const a = value[3]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)

      return { r, g, b, a, max, min }
    }

    toHSL() {
      const { r, g, b, a, max, min } = this.hslObject()
      let h: number
      let s: number
      const l = (max + min) / 2;
      const d = max - min;

      if (max === min) {
        h = s = 0
      } else {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2;               break;
          case b: h = (r - g) / d + 4;               break;
        }
        h /= 6
      }
      return { h: h * 360, s, l, a }
    }

    // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    toHSV() {
      const { r, g, b, a, max, min } = this.hslObject()
      let h: number
      let s: number
      const v = max

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
      return { h: h * 360, s, v, a }
    }

    toARGB() {
      const rgb = [...this.value]
      const alpha = rgb.pop()
      return toHex([alpha * 255].concat(rgb))
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
