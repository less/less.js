import FileManager from './file-manager'
import { IOptions } from '../options'
import Logger from './logger'
/**
 * The Environment class is an abstraction between the Less compiler
 * and the JavaScript environment where it's executed.
 * 
 * File I/O operations, logging, module resolution etc are all
 * managed by the environment instance.
 * 
 * e.g. When Less encounters an @import, it passes the URL to the environment,
 *      with a Promise that is either fulfilled or rejected by the environment.
 */
abstract class Environment {
  fileManagers: FileManager[]
  logger: Logger

  constructor(fileManagers: FileManager[], logger: Logger) {
    this.fileManagers = fileManagers || []
    this.logger = logger
  }

  /**
   * Converts a string to a base 64 string
   */
  abstract encodeBase64(str: string): string

  /**
   * Return the mime-type of a filename
   */
  abstract mimeLookup(filename: string): string

  /**
   * Return the charset of a mime type
   */
  abstract charsetLookup(mime: string): string

  /**
   * Gets a source map generator
   */
  abstract getSourceMapGenerator(): Function

  getFileManager(filename: string, currentDirectory: string, options: IOptions) {
    const fileManagers = this.fileManagers

    if (!filename || !currentDirectory) {
      return
    }

    /**
     * Search fileManagers from back to front
     * (The last one added is the first one tested.)
     */
    for (let i = fileManagers.length - 1; i >= 0 ; i--) {
      const fileManager = fileManagers[i]
      if (fileManager.supports(filename, currentDirectory, options, this)) {
        return fileManager
      }
    }
    return
  }
}

export default Environment
