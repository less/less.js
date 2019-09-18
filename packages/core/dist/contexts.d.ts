import { IOptions } from './options';
import { NodeArray } from './tree/node';
/** Rethink this class, was called contexts.Eval */
export declare class EvalContext {
    inCalc: boolean;
    mathOn: boolean;
    importantScope: {
        important?: string;
    }[];
    calcStack: true[];
    blockStack: true[];
    options: IOptions;
    /**
     * AFAICT, frames are essentially rulesets, used for scope lookups
     * @todo - refactor with a proper block scope object (w/ scope.ts)
     */
    frames: NodeArray;
    constructor(options: IOptions);
    enterCalc(): void;
    exitCalc(): void;
    enterBlock(): void;
    exitBlock(): void;
    isMathOn(op?: string): number | boolean;
    pathRequiresRewrite(path: string): boolean;
    /** @todo - break into environment */
    rewritePath(path: string, rootpath: any): any;
    /** @todo - break into environment */
    normalizePath(path: any): any;
}
