import environment from './environment';
import FileManager from './file-manager';
import UrlFileManager from './url-file-manager';
import createFromEnvironment from '../less';
const less = createFromEnvironment(environment, [new FileManager(), new UrlFileManager()]);
import lesscHelper from './lessc-helper';
import path from 'path';

// allow people to create less with their own environment
less.createFromEnvironment = createFromEnvironment;
less.lesscHelper = lesscHelper;
less.PluginLoader = require('./plugin-loader');
less.fs = require('./fs');
less.FileManager = FileManager;
less.UrlFileManager = UrlFileManager;

// Set up options
less.options = require('../less/default-options')();

// provide image-size functionality
require('./image-size')(less.environment);

export default less;
