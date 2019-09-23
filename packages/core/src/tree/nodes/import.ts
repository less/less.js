import {
  Node,
  IProps,
  ILocationInfo,
  Rules
} from '.'

import { EvalContext } from '../contexts'

//
// CSS @import node
//
// The general strategy here is that we don't want to wait
// for the parsing to be completed, before we start importing
// the file. That's because in the context of a browser,
// most of the time will be spent waiting for the server to respond.
//
// On creation, we push the import path to our import queue, though
// `import,push`, we also pass it a callback, which it'll call once
// the file has been fetched, and parsed.
//
export type IImportOptions = {
  reference?: boolean
  css?: boolean
  less?: boolean
  inline?: boolean
  /** import is a JavaScript ES6 module */
  isModule?: boolean
}
/**
 * @todo - rewrite the above to make browser importing not a factor
 * Also, the import queue should be loaded during evalImports, not parsing
 */
export class Import extends Node {
  content: Node[]
  features: Node[]
  path: Node[]
  options: IImportOptions

  constructor(props: IProps, options: IImportOptions, location: ILocationInfo) {
    if (options.less !== undefined || options.inline) {
      options.css = !options.less || options.inline
    }
    /**
     * We add an empty content object, because this.children can't be mutated after
     * the constructor. After the file is resolved, content will be populated either
     * by a single Rules node, or a Value node (in the case of inline or a JS module)
     */
    props.content = []
    super(props, options, location)
    this.allowRoot = true
  }

  /**
   * If @import still exists in the tree, that means it was preserved
   * Note, both `path` and `features` should have `pre` whitespace preserved. 
   */
  toString() {
    if (this.options.css) {
      return `@import${this.path}${this.features}`
    }
    if (this.options.inline || this.options.less) {
      return this.content[0].toString()
    }
  }

  // eval(context: EvalContext) {
  //   const hasContent = this.content.length === 1
  //   if (hasContent) {
  //     if (this.options.reference || !this.isVisible) {
  //       const rules = this.content[0].nodes
  //       rules.forEach((rule: Node) => {
  //         rule.isVisible = false
  //       })
  //     }
  //   }

  //   super.eval(context)

  //   if (!hasContent) {
  //     return this
  //   }

  //   if (this.options.isModule) {
  //     // context.
  //   }
  //       if (this.root && this.root.eval) {
  //           try {
  //               this.root.eval(context);
  //           }
  //           catch (e) {
  //               e.message = 'Plugin error during evaluation';
  //               throw new LessError(e, this.root.imports, this.root.filename);
  //           }
  //       }
  //       registry = context.frames[0] && context.frames[0].functionRegistry;
  //       if ( registry && this.root && this.root.functions ) {
  //           registry.addMultiple( this.root.functions );
  //       }

  //       // return [];
  

  //       if (this.skip) {
  //           if (typeof this.skip === 'function') {
  //               this.skip = this.skip();
  //           }
  //           if (this.skip) {
  //               return [];
  //           }
  //       }
  //       if (this.options.inline) {
  //           const contents = new Anonymous(this.root, 0,
  //               {
  //                   filename: this.importedFilename,
  //                   reference: this.path._fileInfo && this.path._fileInfo.reference
  //               }, true, true);

  //           return this.features ? new Media([contents], this.features.value) : [contents];
  //       } else if (this.css) {
  //           const newImport = new Import(this.evalPath(context), features, this.options, this._index);
  //           if (!newImport.css && this.error) {
  //               throw this.error;
  //           }
  //           return newImport;
  //       } else {
  //           rules = new Rules(null, utils.copyArray(this.root.rules));
  //           rules.evalImports(context);

  //           return this.features ? new Media(rules.rules, this.features.value) : rules.rules;
  //       }
  //   }
}

Import.prototype.type = 'Import'
