import { MathMode, RewriteUrlMode } from './constants'
import { IOptions } from './options'
import Node from './tree/node'

function isPathRelative(path: string) {
    return !/^(?:[a-z-]+:|\/|#)/i.test(path);
}

function isPathLocalRelative(path: string) {
  return path.charAt(0) === '.';
}

/** Rethink this class, was called contexts.Eval */
export class EvalContext {
  inCalc: boolean
  mathOn: boolean
  importantScope: { important?: string }[]
  calcStack: true[]
  blockStack: true[]
  options: IOptions
  /**
   * AFAICT, frames are essentially rulesets, used for scope lookups
   * @todo - refactor with a proper block scope object (w/ scope.ts)
   */
  frames: Node[]

  constructor(options: IOptions) {
    this.options = options
    this.frames = []
    this.importantScope = []
    this.inCalc = false
    this.mathOn = true
  }

  enterCalc() {
    if (!this.calcStack) {
      this.calcStack = []
    }
    this.calcStack.push(true)
    this.inCalc = true
  }

  exitCalc() {
    this.calcStack.pop()
    if (this.calcStack.length === 0) {
      this.inCalc = false
    }
  }

  enterBlock() {
    if (!this.blockStack) {
      this.blockStack = []
    }
    this.blockStack.push(true)
  }

  exitBlock() {
    this.blockStack.pop()
  }

  isMathOn(op?: string) {
    if (!this.mathOn) {
      return false
    }
    const mathMode = this.options.math
    if (op === '/' && mathMode !== MathMode.ALWAYS && (!this.blockStack || !this.blockStack.length)) {
      return false
    }
    if (mathMode > MathMode.PARENS_DIVISION) {
      return this.blockStack && this.blockStack.length
    }
    return true;
  }

  pathRequiresRewrite(path: string) {
    const isRelative = this.options.rewriteUrls === RewriteUrlMode.LOCAL ? isPathLocalRelative : isPathRelative

    return isRelative(path)
  }

  /** @todo - break into environment */
  rewritePath(path: string, rootpath) {
    let newPath;

    rootpath = rootpath || ''
    newPath = this.normalizePath(rootpath + path)

    // If a path was explicit relative and the rootpath was not an absolute path
    // we must ensure that the new path is also explicit relative.
    if (isPathLocalRelative(path) &&
      isPathRelative(rootpath) &&
      isPathLocalRelative(newPath) === false) {
      newPath = `./${newPath}`
    }

    return newPath
  }

  /** @todo - should be on environment fileManager */
  normalizePath(path) {
    const segments = path.split('/').reverse()
    let segment;

    path = [];
    while (segments.length !== 0) {
      segment = segments.pop();
      switch ( segment ) {
        case '.':
          break;
        case '..':
          if ((path.length === 0) || (path[path.length - 1] === '..')) {
              path.push( segment );
          } else {
              path.pop();
          }
          break;
        default:
          path.push(segment);
          break;
      }
    }

    return path.join('/')
  }
}
