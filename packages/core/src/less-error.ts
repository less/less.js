// import * as utils from './utils';
import Rules from './tree/nodes/rules'
import { ILocationInfo } from './tree/node'
import { TextFormat, TextStyleFunction } from './types'

export interface ILessError {
  message: string
  filename?: string
  stack?: string
  type?: string
  location?: ILocationInfo
  call?: number
}

/**
 * This is a centralized class of any error that could be thrown internally (mostly by the parser).
 * Besides standard .message it keeps some additional data like a path to the file where the error
 * occurred along with line and column numbers.
 *
 * @param e              - An error object to wrap around or just a descriptive object
 * @param sourceObject   - the original object that can be output with .toString()
 * @param currentFilename
 */
class LessError extends Error {
  type: string
  file: Rules | string
  filename: string
  index: number
  line: number
  column: number
  callLine: number
  callExtract: number

  constructor(e: ILessError, file?: Rules | string, currentFilename?: string) {
    let { message, location, filename, stack } = e

    super(message)

    if (file instanceof Rules) {
      filename = file.fileInfo.filename
    } else if (currentFilename) {
      filename = currentFilename
    }

    this.message = message
    this.stack = stack

    if (filename) {
      let line: number
      let col: number
      let index: number

      if (location) {
        line = location.startLine
        col = location.startColumn
        index = location.startOffset
      }
      
      // const callLine = e.call && utils.getLocation(e.call, input).line

      this.type = e.type || 'Syntax'
      this.filename = filename
      this.index = index
      this.line = line
      this.column = col

      if (!line && stack) {
        const found = stack.match(/(<anonymous>|Function):(\d+):(\d+)/);

        if (found) {
          if (found[2]) {
            this.line = parseInt(found[2]) - 2
          }
          if (found[3]) {
            this.column = parseInt(found[3])
          }
        }
      }

      // this.callLine = callLine + 1
      // this.callExtract = this.sourceLines[callLine]
    }
  }

  /**
   * Re-create input for error messaging
   */
  getLinesFromNode(lines: Map<number, string>, node: Rules, startLine: number) {
    const rules = node.nodes

    let started: boolean = false
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      const location = rule.location
      if (!started && location.startLine > startLine) {
        started = true
        const lastRule = rules[i - 1]
        let lastStartLine = lastRule.location.startLine
        const input = lastRule.toString().split('\n')
        input.forEach((line, offset) => {
          lines.set(lastStartLine + offset, line)
        })
        if (location.endLine > startLine + 2) {
          break
        }
      }
    }
    return lines
  }

  /**
   * An overridden version of the default Object.prototype.toString
   * which uses additional information to create a helpful message.
   */
  toString(stylize?: TextStyleFunction): string {
    const file = this.file
    let lines: Map<number, string>

    if (file) {
      lines = new Map()
      if (file instanceof Rules) {
        this.getLinesFromNode(lines, file, this.line - 1)
      } else {
        file.split('\n').forEach((line, i) => {
          lines.set(i + 1, line)
        })
      }
    }

    let message: string
    const errorLines = []
    let error: string = ''
    let extract: string[]
  
    if (lines) {
      extract = [
        lines.get(this.line - 1) || '',
        lines.get(this.line) || '',
        lines.get(this.line)
      ]
    } else {
      extract = ['', '', '']
    }

    if (!stylize) {
      stylize = (str: string) => str
    } else if (stylize.constructor !== Function) {
      throw Error(`The 'stylize' option for LessError should be a function.`);
    }

    if (this.line !== null) {
      if (extract[0]) {
        errorLines.push(stylize(`${this.line - 1} ${extract[0]}`, TextFormat.GREY))
      }

      if (extract[1]) {
        let errorTxt = `${this.line} `
        if (extract[1]) {
          errorTxt += extract[1].slice(0, this.column) +
            stylize(stylize(stylize(extract[1].substr(this.column, 1), TextFormat.BOLD) +
              extract[1].slice(this.column + 1), TextFormat.RED), TextFormat.INVERSE)
        }
        errorLines.push(errorTxt)
      }

      if (extract[2]) {
        errorLines.push(stylize(`${this.line + 1} ${extract[2]}`, TextFormat.GREY))
      }
      error = `${errorLines.join('\n') + stylize('', TextFormat.RESET)}\n`
    }

    if (this.type === 'Warning') {
      message = stylize(`${this.message}`, TextFormat.GREY)
    } else {
      message = stylize(`${this.type}Error: ${this.message}`, TextFormat.RED)
    }
    if (this.filename) {
      message += stylize(' in ', TextFormat.RED) + this.filename
    }
    if (this.line) {
      message += stylize(` on line ${this.line}, column ${this.column + 1}:`, TextFormat.GREY)
    }

    message += `\n${error}`

    // if (this.callLine) {
    //   message += `${stylize('from ', 'red') + (this.filename || '')}/n`;
    //   message += `${stylize(this.callLine, 'grey')} ${this.callExtract}/n`;
    // }

    return message
  }
}

export default LessError