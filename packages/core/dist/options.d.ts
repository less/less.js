import { MathMode, RewriteUrlMode, StrictUnitMode } from './constants';
export interface IOptions {
    depends: boolean;
    /** @todo - move to separate utility */
    /** @todo - move to file plugin */
    strictImports: boolean;
    /** @todo - move to lessc only */
    /** @todo - move to file plugin */
    /** @todo - provide relative url thing in file manager */
    rootpath: string;
    rewriteUrls: RewriteUrlMode;
    math: MathMode;
    strictUnits: StrictUnitMode;
    /**
     * Effectively the declaration is put at the top of your base Less file,
     * meaning it can be used but it also can be overridden if this variable
     * is defined in the file.
     */
    globalVars: Object;
    /**
     * As opposed to the global variable option, this puts the declaration at the
     * end of your base file, meaning it will override anything defined in your Less file.
     */
    modifyVars: Object;
}
declare const _default: () => {
    javascriptEnabled: boolean;
    depends: boolean;
    compress: boolean;
    lint: boolean;
    paths: any[];
    color: boolean;
    strictImports: boolean;
    insecure: boolean;
    rootpath: string;
    rewriteUrls: boolean;
    math: number;
    strictUnits: boolean;
    globalVars: any;
    modifyVars: any;
    urlArgs: string;
};
export default _default;
