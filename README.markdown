less.js with blend modes
====

**Using less version 1.3.0**

This fork of less.js is identical to the cloudhead, with the addition of common blending modes used in image processing programs, like Photoshop. The three most common blend modes have been supplied, which should cover most use-cases. More modes could easily be added, if there is an interest.

For more information on less.js in general, please view [the official project page](http://lesscss.org).

Usage
---

`blend(@mode, @color1, @color2, @alpha)`

Returns a color that is a blend of @color1 and @color2, using the algorithm specified by @mode. An option @alpha parameter may be supplied. The valid options for each parameter are as follows:

### @mode

- **multiply:** looks at the color information in each channel and multiplies the base color by the blend color. The result color is always a darker color. Multiplying any color with black produces black. Multiplying any color with white leaves the color unchanged.
- **screen:** looks at each channel’s color information and multiplies the inverse of the blend and base colors. The result color is always a lighter color. Screening with black leaves the color unchanged. Screening with white produces white. The effect is similar to projecting multiple photographic slides on top of each other.
- **overlay:** multiplies or screens the colors, depending on the base color. Patterns or colors overlay the existing pixels while preserving the highlights and shadows of the base color. The base color is not replaced, but mixed with the blend color to reflect the lightness or darkness of the original color.

(Descriptions taken from [An Explanation of Photoshop Blend Modes](http://www.myinkblog.com/an-explanation-of-photoshop-blend-modes/), by Angie Bowen)

### @color1

A color in any valid format (hex, rgb, rgba, hsl, hsla). Alpha channels will be ignored.

### @color2

A color in any valid format (hex, rgb, rgba, hsl, hsla). Alpha channels will be ignored.

### @alpha

_Optional (default: 1)_ A value between 0 and 1. This affects the intensity of the blend. 1 being as intense as possible, 0 being, like, why did you even bother.

Demo
---

<http://timhettler.github.com/less.js/>