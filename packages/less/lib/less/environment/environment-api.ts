export interface Environment {
    /**
     * Converts a string to a base 64 string
     */
    encodeBase64(str: string): string
    /**
     * Lookup the mime-type of a filename
     */
    mimeLookup(filename: string): string
    /**
     * Look up the charset of a mime type
     * @param mime
     */
    charsetLookup(mime: string): string
    /**
     * Gets a source map generator
     *
     * @todo - Figure out precise type
     */
    getSourceMapGenerator(): any
}
