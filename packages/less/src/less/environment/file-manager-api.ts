import type { Environment } from './environment-api'

export interface FileManager {
    /**
     * Given the full path to a file, return the path component
     * Provided by AbstractFileManager
     */
    getPath(filename: string): string
    /**
     * Append a .less extension if appropriate. Only called if less thinks one could be added.
     * Provided by AbstractFileManager
     */
    tryAppendLessExtension(filename: string): string
    /**
     * Whether the rootpath should be converted to be absolute.
     * The browser ovverides this to return true because urls must be absolute.
     * Provided by AbstractFileManager (returns false)
     */
    alwaysMakePathsAbsolute(): boolean
    /**
     * Returns whether a path is absolute
     * Provided by AbstractFileManager
     */
    isPathAbsolute(path: string): boolean
    /**
     * joins together 2 paths
     * Provided by AbstractFileManager
     */
    join(basePath: string, laterPath: string): string
    /**
     * Returns the difference between 2 paths
     * E.g. url = a/ baseUrl = a/b/ returns ../
     * url = a/b/ baseUrl = a/ returns b/
     * Provided by AbstractFileManager
     */
    pathDiff(url: string, baseUrl: string): string
    /**
     * Returns whether this file manager supports this file for syncronous file retrieval
     * If true is returned, loadFileSync will then be called with the file.
     * Provided by AbstractFileManager (returns false)
     * 
     * @todo - Narrow Options type
     */
    supportsSync(
        filename: string,
        currentDirectory: string,
        options: Record<string, any>,
        environment: Environment
    ): boolean
    /**
     * If file manager supports async file retrieval for this file type
     */
    supports(
        filename: string,
        currentDirectory: string,
        options: Record<string, any>,
        environment: Environment
    ): boolean
    /**
     * Loads a file asynchronously.
     */
    loadFile(
        filename: string,
        currentDirectory: string,
        options: Record<string, any>,
        environment: Environment
    ): Promise<{ filename: string, contents: string }>
    /**
     * Loads a file synchronously. Expects an immediate return with an object
     */
    loadFileSync(
        filename: string,
        currentDirectory: string,
        options: Record<string, any>,
        environment: Environment
    ): { error?: unknown, filename: string, contents: string }
}
