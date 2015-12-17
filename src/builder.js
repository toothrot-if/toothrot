/* global require, Buffer, process, __dirname */

var fs = require("fs");
var ncp = require("ncp").ncp;
var rimraf = require("rimraf");
var normalize = require("path").normalize;
var pack = require("./packer").pack;
var os = require("os");

var engineFile = normalize(__dirname + "/../build/toothrot.js");

function build (dir, outputDir, buildDesktop) {
    
    var rawResources, resources, indexContent;
    var base = normalize((dir || process.cwd()) + "/");
    var buildDir = normalize(outputDir || (base + "build/"));
    var browserDir = normalize(buildDir + "/browser/");
    var desktopDir = normalize(buildDir + "/desktop/");
    var tmpDir = normalize(os.tmpdir() + "/toothrot_" + Math.round(Math.random() * 10000));
    var filesDir = normalize(base + "/files/");
    var projectFile = normalize(base + "/project.json");
    var project = JSON.parse("" + fs.readFileSync(projectFile));
    
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
                return console.error(error);
            }
            
            ncp(tmpDir, browserDir, function (error) {
                
                if (error) {
                    return console.error(error);
                }
                
                fs.writeFileSync(
                    normalize(browserDir + "/toothrot.js"),
                    fs.readFileSync(engineFile)
                );
                
                rawResources = pack(base);
                resources = new Buffer(rawResources).toString("base64");
                
                indexContent = "(function () {" +
                        "window.toothrotResources = '" + resources + "';" +
                    "}());";
                
                fs.writeFileSync(browserDir + "resources.js", indexContent);
                
                console.log("Toothrot Engine project built successfully in: " + browserDir);
                
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
                        console.log("Desktop apps build in: " + desktopDir);
                    }).
                    catch(function (error) {
                        console.error("Cannot build desktop apps: " + error);
                    });
                }
            });
        });
    }
}

function buildDesktopApps (buildDir, platforms, version) {
    
    var NwBuilder = require("nw-builder");
    var browserDir = normalize(buildDir + "/browser/");
    var desktopDir = normalize(buildDir + "/desktop/");
    
    if (!Array.isArray(platforms) || platforms.length < 1) {
        return;
    }
    
    console.log("dirs:", browserDir, desktopDir);
    
    var nw = new NwBuilder({
        files: browserDir + "**",
        buildDir: desktopDir,
        platforms: platforms,
        version: version
    });
    
    return nw.build();
    
}

module.exports.build = build;
module.exports.buildDesktopApps = buildDesktopApps;
