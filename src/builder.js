/* global require, Buffer, process, __dirname */
/* eslint-disable no-console */

var fs = require("fs");
var ncp = require("ncp").ncp;
var rimraf = require("rimraf");
var normalize = require("path").normalize;
var pack = require("./packer").pack;
var os = require("os");
var osenv = require("osenv");
var recurse = require('recursive-readdir');
var colors = require("colors");
var merge = require("deepmerge");

var engineFile = normalize(__dirname + "/../build/toothrot.js");

function build(dir, outputDir, buildDesktop, then) {
    
    var rawResources, resources, indexContent;
    var base = normalize((dir || process.cwd()) + "/");
    var buildDir = normalize(outputDir || (base + "build/"));
    var browserDir = normalize(buildDir + "/browser/");
    var desktopDir = normalize(buildDir + "/desktop/");
    var tmpDir = normalize(os.tmpdir() + "/toothrot_" + Math.round(Math.random() * 10000));
    var filesDir = normalize(base + "/files/");
    var projectFile = normalize(base + "/project.json");
    var project = JSON.parse("" + fs.readFileSync(projectFile));
    
    then = then || function () {};
    
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }
    
    if (buildDesktop && fs.existsSync(desktopDir)) {
        if (fs.existsSync(browserDir)) {
            rimraf(browserDir, function () {
                rimraf(desktopDir, function () {
                    copyContents();
                });
            });
        }
        else {
            rimraf(desktopDir, function () {
                copyContents();
            });
        }
    }
    else if (fs.existsSync(browserDir)) {
        rimraf(browserDir, function () {
            copyContents();
        });
    }
    else {
        copyContents();
    }
    
    function copyContents() {
        
        if (!fs.existsSync(browserDir)) {
            fs.mkdirSync(browserDir);
        }
        
        if (buildDesktop && !fs.existsSync(desktopDir)) {
            fs.mkdirSync(desktopDir);
        }
        
        ncp(filesDir, tmpDir, function (error) {
            
            if (error) {
                then(error);
                return console.error(error);
            }
            
            ncp(tmpDir, browserDir, function (error) {
                
                if (error) {
                    then(error);
                    return console.error(error);
                }
                
                fs.writeFileSync(
                    normalize(browserDir + "/toothrot.js"),
                    fs.readFileSync(engineFile)
                );
                
                try {
                    rawResources = pack(base);
                }
                catch (error) {
                    
                    if (error.isToothrotError) {
                        then(error);
                        console.error(colors.red(error.toothrotMessage));
                        return;
                    }
                    
                    if (Array.isArray(error)) {
                        reportErrors(error);
                        then(error);
                        return;
                    }
                    
                    throw error;
                }
                
                project.name = JSON.parse(rawResources).story.meta.title || project.name;
                resources = new Buffer(encodeURIComponent(rawResources)).toString("base64");
                
                indexContent = "(function () {" +
                        "window.toothrotResources = '" + resources + "';" +
                    "}());";
                
                fs.writeFileSync(browserDir + "resources.js", indexContent);
                fs.writeFileSync(projectFile, JSON.stringify(project, null, 4));
                
                console.log(
                    colors.green("Toothrot Engine project built successfully in: " + browserDir)
                );
                
                createAppCacheFile(browserDir);
                
                if (buildDesktop) {
                    
                    console.log("Building desktop apps...");
                    
                    fs.writeFileSync(
                        normalize(browserDir + "/package.json"),
                        JSON.stringify(project, null, 4)
                    );
                    
                    buildDesktopApps(
                        buildDir,
                        project.electron || {},
                        function (error) {
                            
                            if (error) {
                                then(error);
                                console.error(colors.red("Cannot build desktop apps: " + error));
                                return;
                            }
                            
                            then(null);
                            console.log(colors.green("Desktop apps build in: " + desktopDir));
                        }
                    );
                }
                else {
                    then(null);
                }
            });
        });
    }
}

function buildDesktopApps(buildDir, config, then) {
    
    var options = merge({}, config);
    var package = require("electron-packager");
    var browserDir = normalize(buildDir + "/browser/");
    var desktopDir = normalize(buildDir + "/desktop/");
    var cacheDir = normalize(osenv.home() + "/toothrot-cache/");
    
    console.log(options);
    
    if (!Array.isArray(config.platform) || config.platform.length < 1) {
        then("no electron platforms specified");
        return;
    }
    
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }
    
    options = merge(options, {
        dir: browserDir,
        out: desktopDir,
        platform: config.platform,
        version: config.version,
        prune: "prune" in config ? config.prune : false,
        asar: "asar" in config ? config.asar : true,
        overwrite: "overwrite" in config ? config.overwrite : true,
        tmpdir: "tmpdir" in config ? config.tmpdir : false,
        download: {
            cache: config.download && config.download.cache ? config.download.cache : cacheDir
        }
    });
    
    return package(options, then);
    
}

function createAppCacheFile(dir) {
    
    var cacheFile = "" +
        "CACHE MANIFEST\n" +
        "# Timestamp: " + Date.now() + "\n" +
        "# Automatically created by Toothrot Engine\n" +
        "\n" +
        "CACHE:\n";
    
    var cacheFilePath = normalize(dir + "/cache.manifest");
    
    recurse(dir, function (error, files) {
        
        if (error) {
            return console.error(error);
        }
        
        files.forEach(function (file) {
            cacheFile += normalizePath(file) + "\n";
        });
        
        fs.writeFileSync(cacheFilePath, cacheFile);
        
        console.log(colors.green("Created appcache file at: " + cacheFilePath));
    });
    
    function normalizePath(path) {
        return (path.split(dir)[1] || "").replace("\\", "/");
    }
}

function reportErrors(errors) {
    errors.forEach(function (error) {
        console.error(colors.red(error.toothrotMessage || error.message));
    });
}

module.exports.build = build;
module.exports.buildDesktopApps = buildDesktopApps;
