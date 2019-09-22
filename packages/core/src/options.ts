import {
  MathMode,
  RewriteUrlMode,
  StrictUnitMode,
  EvalErrorMode
} from './constants'

export interface IOptions {
  /** 
   * Inline JavaScript
   * @removed
   */
  // javascriptEnabled: boolean 
  
  /**
   * Outputs a makefile import dependency list to stdout.
   * @todo - move to lessc
   * @todo - should also be called something like "output dependency"
   * @moved
   */
  // depends: boolean

  /**
   * Compress using less built-in compression. 
   * @removed
   */
  //  compress: false,

  /**
   * Runs the less parser and just reports errors without any output.
   */
  lint: boolean

  /**
   * By default, Less throws errors immediately when evaluating,
   * but two other behaviors are available
   * 
   *   0 THROW     - throw eval errors immediately
   *   1 REPORT    - collect and list ALL eval errors, but no output
   *   2 IGNORE    - return errors along with recovered output
   */
  evalErrors: EvalErrorMode

  /**
   * Sets available include paths.
   * If the file in an @import rule does not exist at that exact location, 
   * less will look for it at the location(s) passed to this option. 
   * You might use this for instance to specify a path to a library which 
   * you want to be referenced simply and relatively in the less files.
   * @todo - move to file plugin
   * @moved
   */
  // paths: [],

  /** 
   * The strictImports controls whether the compiler will allow an @import inside of either 
   * @media blocks or (a later addition) other selector blocks.
   * See: https://github.com/less/less.js/issues/656
   */
  strictImports: boolean

  /**
   * color output in the terminal
   * @todo - move to lessc options only
   * @moved 
   */
  // color: boolean

  /** 
   * Allow Imports from Insecure HTTPS Hosts
   * @todo - move to file plugin
   */
  // insecure: boolean

  /** 
   * Allows you to add a path to every generated import and url in your css. 
   * This does not affect less import statements that are processed, just ones 
   * that are left in the output css.
   *
   * @todo - provide rootpath option in file manager
   * @moved
   */
  // rootpath: string

  /**
   * By default URLs are kept as-is, so if you import a file in a sub-directory 
   * that references an image, exactly the same URL will be output in the css. 
   * This option allows you to re-write URL's in imported files so that the 
   * URL is always relative to the base imported file
   * 
   * @todo - move to file manager options
   * @moved
   */
  // rewriteUrls: RewriteUrlMode

  /**
   * How to process math 
   *   0 always (REMOVED)          - eagerly try to solve all operations
   *   1 no-division (default)     - process division in blocks, but other math outside of blocks
   *   2 strict                    - process math only in blocks
   *   3 strict-legacy (REMOVED)   - legacy strict behavior (super-strict)
   */
  math: MathMode

  /*
   *   0 loose            - Coerce units to the first unit's type during operations
   *   1 warn (default)   - Don't coerce units, and instead output expressions as they are
   *   2 error            - Don't coerce units, and throw error
   */
  strictUnits: StrictUnitMode

  /**
   * Effectively the declaration is put at the top of your base Less file, 
   * meaning it can be used but it also can be overridden if this variable 
   * is defined in the file.
   * 
   * @todo - move to a tree method
   * @moved
   */
  // globalVars: Object

  /**
   * As opposed to the global variable option, this puts the declaration at the
   * end of your base file, meaning it will override anything defined in your Less file.
   * 
   * @todo - move to a tree method
   * @moved
   */
  // modifyVars: Object

  /**
   * An argument to be appended to every URL
   *
   * @todo - move to file manager
   * @moved
   */
  // urlArgs: string
}

// Export a new default each time
/** @todo - where are sourcemap options? */
export default () => ({
  lint: false,
  evalErrors: EvalErrorMode.THROW,
  strictImports: false,
  math: MathMode.NO_DIVISION,
  strictUnits: StrictUnitMode.WARN
});