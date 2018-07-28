/* global __dirname, process */

var semver = require("semver");
var createApp = require("multiversum/bootstrap").bootstrap;

// @ts-ignore
var package = require("./package.json");
var TOOTHROT_DIR = __dirname;

function createToothrotApp(config) {
    
    config = config || {};
    config.applicationStep = config.applicationStep || "build";
    config.debug = config.debug === true;
    config.paths = Array.isArray(config.paths) ? config.paths : [];
    
    config.paths.unshift(TOOTHROT_DIR);
    config.paths.unshift(process.cwd());
    
    return createApp(config.paths, {
        patterns: ["**/*.com.json"],
        onError: config.debug ? (config.onError || undefined) : (config.onError || function () {}),
        filter: function (component) {
            
            if (component.application !== "toothrot") {
                return false;
            }
            
            if (!semver.satisfies(package.version, component.applicationVersion)) {
                return false;
            }
            
            if (
                !("environments" in component) ||
                !Array.isArray(component.environments) ||
                component.environments.indexOf("node") < 0
            ) {
                return;
            }
            
            if (
                !config.debug &&
                // @ts-ignore
                Array.isArray(component.flags) &&
                // @ts-ignore
                component.flags.indexOf("debug") >= 0
            ) {
                return false;
            }
            
            return component.applicationSteps.indexOf(config.applicationStep) >= 0;
        }
    });
}

module.exports = {
    createApp: createToothrotApp
};
