/* global require, Buffer, process, __dirname */

var fs = require("fs");
var ncp = require("ncp").ncp;
var rimraf = require("rimraf");
var normalize = require("path").normalize;
var pack = require("./packer").pack;
var os = require("os");
var osenv = require("osenv");
var recurse = require('recursive-readdir');
var colors = require("colors");

var engineFile = normalize(__dirname + "/../build/toothrot.js");

function build (dir, outputDir, buildDesktop, then) {
    
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
    
    function copyContents () {
        
        fs.mkdirSync(browserDir);
        
        if (buildDesktop) {
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
                    
                    throw error;
                }
                
                project.name = JSON.parse(rawResources).story.meta.title || project.name;
                resources = new Buffer(rawResources).toString("base64");
                
                indexContent = "(function () {" +
                        "window.toothrotResources = '" + resources + "';" +
                    "}());";
                
                fs.writeFileSync(browserDir + "resources.js", indexContent);
                fs.writeFileSync(projectFile, JSON.stringify(project, null, 4));
                
                console.log(
                    colors.green("Toothrot Engine project built successfully in: " + browserDir)
                );
                
                createAppCacheFile(browserDir);
                
                if (
                    buildDesktop &&
                    Array.isArray(project.platforms) &&
                    project.platforms.length > 0
                ) {
                    
                    console.log("Building desktop apps...");
                    
                    fs.writeFileSync(
                        normalize(browserDir + "/package.json"),
                        JSON.stringify(project, null, 4)
                    );
                    
                    buildDesktopApps(buildDir, project.platforms, project.nwVersion).
                    then(function () {
                        then(null);
                        console.log(colors.green("Desktop apps build in: " + desktopDir));
                    }).
                    catch(function (error) {
                        then(error);
                        console.error(colors.red("Cannot build desktop apps: " + error));
                    });
                }
                else {
                    then(null);
                }
            });
        });
    }
}

function buildDesktopApps (buildDir, platforms, version) {
    
    var NwBuilder = require("nw-builder");
    var browserDir = normalize(buildDir + "/browser/");
    var desktopDir = normalize(buildDir + "/desktop/");
    var cacheDir = normalize(osenv.home() + "/toothrot-cache/");
    
    if (!Array.isArray(platforms) || platforms.length < 1) {
        return;
    }
    
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }
    
    var nw = new NwBuilder({
        files: browserDir + "**",
        buildDir: desktopDir,
        platforms: platforms,
        version: version,
        cacheDir: cacheDir
    });
    
    return nw.build();
    
}

function createAppCacheFile (dir) {
    
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
    
    function normalizePath (path) {
        return (path.split(dir)[1] || "").replace("\\", "/");
    }
}

module.exports.build = build;
module.exports.buildDesktopApps = buildDesktopApps;
