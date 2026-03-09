import { createRequire } from 'module';
import environment from './environment.js';
import FileManager from './file-manager.js';
import UrlFileManager from './url-file-manager.js';
import createFromEnvironment from '../less/index.js';
import lesscHelper from './lessc-helper.js';
import PluginLoader from './plugin-loader.js';
import fs from './fs.js';
import defaultOptions from '../less/default-options.js';
import imageSize from './image-size.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const less = createFromEnvironment(environment, [new FileManager(), new UrlFileManager()], version);

// allow people to create less with their own environment
less.createFromEnvironment = createFromEnvironment;
less.lesscHelper = lesscHelper;
less.PluginLoader = PluginLoader;
less.fs = fs;
less.FileManager = FileManager;
less.UrlFileManager = UrlFileManager;

// Set up options
less.options = defaultOptions();

// provide image-size functionality
imageSize(less.environment);

export default less;
