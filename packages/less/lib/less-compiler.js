import { Compiler } from '@jesscss/compiler';
import nodeModulesPlugin from '@jesscss/plugin-node-modules';

/**
 * The compiler `less.render()` runs: the Jess compiler with Less's default
 * plugins. It names its own module, so a render that reaches a `@plugin`
 * script runs whole in the `@jesscss/plugin-js` sandbox with this same
 * compiler, made there from this module.
 */
export class LessCompiler extends Compiler {
  /*
   * Spelled relative to `lib/` so it names this file from the ESM entry and
   * from the bundled CommonJS build in `dist/` alike.
   */
  static moduleIdentity = { module: new URL('../lib/less-compiler.js', import.meta.url).href, exportName: 'LessCompiler' };

  /**
   * @param {object} configOptions
   */
  constructor(configOptions) {
    super(configOptions, {
      defaultPlugins: context => [nodeModulesPlugin({ basePath: context.resolutionBaseDir })],
      scriptPluginSpecifier: '@jesscss/plugin-js',
      scriptPluginResolveFrom: import.meta.url
    });
  }
}
