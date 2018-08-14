/* global __dirname, process */

var fs = require("fs");
var path = require("path");
var semver = require("semver");
var createApp = require("multiversum/bootstrap").bootstrap;

// @ts-ignore
var package = require("./package.json");
var TOOTHROT_DIR = __dirname;

function createToothrotApp(config) {
    
    var app;
    
    var resources = {};
    
    config = config || {};
    config.applicationStep = config.applicationStep || "build";
    config.environments = Array.isArray(config.environments) ? config.environments : ["node"];
    config.debug = config.debug === true;
    config.paths = Array.isArray(config.paths) ? config.paths : [];
    
    config.paths.unshift(TOOTHROT_DIR);
    config.paths.unshift(process.cwd());
    
    app = createApp(config.paths, {
        patterns: ["**/*.com.json"],
        onError: config.debug ? (config.onError || undefined) : (config.onError || function () {}),
        filter: function (component, filePath) {
            
            if (component.application !== "toothrot") {
                return false;
            }
            
            if (!semver.satisfies(package.version, component.applicationVersion)) {
                return false;
            }
            
            if (
                !("environments" in component) ||
                !Array.isArray(component.environments) ||
                !matchesEnvironments(component.environments, config.environments)
            ) {
                return;
            }
            
            if (
                !config.debug &&
                // @ts-ignore
                Array.isArray(component.flags) &&
                // @ts-ignore
                (!config.debug && component.flags.indexOf("debug") >= 0)
            ) {
                return false;
            }
            
            if (component.applicationSteps.indexOf(config.applicationStep) >= 0) {
                
                if (component.resources && typeof component.resources === "object") {
                    addResources(component.resources, path.dirname(filePath));
                }
                
                return true;
            }
            
            return false;
        }
    });
    
    app.decorate("getModule", function (fn) {
        return function (name) {
            
            var result = fn(name);
            
            if (result) {
                return result;
            }
            
            return require(name);
        };
    });
    
    app.connect("getResource", function (name) {
        return resources[name];
    });
    
    app.connect("getEngineVersion", function () {
        return package.version;
    });
    
    return app;
    
    function addResources(componentResources, componentDir) {
        Object.keys(componentResources).forEach(function (resourceName) {
            
            var resource = componentResources[resourceName];
            var filePath = typeof resource === "string" ? resource : resource.source;
            var fullPath = path.join(componentDir, filePath);
            
            if (!fs.existsSync(fullPath)) {
                throw new Error("Resource cannot be found: " + fullPath);
            }
            
            resources[resourceName] = "" + fs.readFileSync(fullPath);
        });
    }
}

function matchesEnvironments(componentEnvironments, applicationEnvironments) {
    return componentEnvironments.some(function (env) {
        return applicationEnvironments.indexOf(env) >= 0;
    });
}

module.exports = {
    createApp: createToothrotApp
};
