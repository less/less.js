import environment from "./environment";
import FileManager from "./file-manager";
import UrlFileManager from "./url-file-manager";
import createFromEnvironment from "../less";
const less = createFromEnvironment(environment, [new FileManager(), new UrlFileManager()]);
import lesscHelper from './lessc-helper';
import fs from 'fs';
import path from 'path';
import PluginLoader from './plugin-loader';
import optionsFactory from '../less/default-options';
import imageSize from './image-size';

// allow people to create less with their own environment
less.createFromEnvironment = createFromEnvironment;
less.lesscHelper = lesscHelper;
less.PluginLoader = PluginLoader;
less.fs = fs;
less.FileManager = FileManager;
less.UrlFileManager = UrlFileManager;

// Set up options
less.options = optionsFactory();
less.options.paths = [
    path.join(process.cwd(), "node_modules")
];

// provide image-size functionality
imageSize(less.environment);

export default less;
