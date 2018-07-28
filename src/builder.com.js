/* global require, Buffer, process, __dirname */

var fs = require("fs");
var ncp = require("ncp").ncp;
var rimraf = require("rimraf");
var semver = require("semver");
var joinPath = require("path").join;
var getBaseName = require("path").basename;
var browserify = require("browserify");
var normalize = require("path").normalize;
var os = require("os");
var recurse = require('recursive-readdir');
var merge = require("deepmerge");
var createGatherer = require("multiversum/gatherer").create;

var TOOTHROT_DIR = joinPath(__dirname, "/../");

// @ts-ignore
var package = require(joinPath(TOOTHROT_DIR, "/package.json"));

function create(context) {
    
    var logger, packer;
    
    var api = context.createInterface("builder", {
        build: build,
        buildDesktopApps: buildDesktopApps,
        createAppCacheFile: createAppCacheFile,
        reportErrors: reportErrors
    });
    
    function init() {
        logger = context.getInterface("logger", ["log", "error", "info", "success"]);
        packer = context.getInterface("packer", ["pack"]);
        context.connectInterface(api);
    }
    
    function destroy() {
        logger = null;
        packer = null;
        context.disconnectInterface(api);
    }
    
    function gatherComponents(dir) {
        
        var gatherer = createGatherer(context);
        
        gatherer.init();
        
        logger.info("Gathering components in `" + dir + "` and `" + TOOTHROT_DIR + "`...");
        
        var components = gatherer.gather([TOOTHROT_DIR, dir], {
            patterns: ["**/*.com.json"],
            filter: function (component) {
                
                var result = false;
                
                if (component.application !== "toothrot") {
                    return false;
                }
                
                if (!semver.satisfies(package.version, component.applicationVersion)) {
                    return false;
                }
                
                result = component.applicationSteps.indexOf("run") >= 0;
                
                if (result) {
                    // @ts-ignore
                    logger.log("Component added:", component.file);
                }
                
                return result;
            }
        });
        
        logger.success("Component gathering completed.");
        
        return components;
    }
    
    function createBootstrapFile(dir, outputPath, then) {
        
        var componentFileContent;
        
        var modulesPath = joinPath(TOOTHROT_DIR, "/node_modules/");
        var tmpDir = createTempFolderPath();
        var components = gatherComponents(dir);
        var appSrcFilePath = joinPath(TOOTHROT_DIR, "/src/runtimes/browser.js");
        var appDestFilePath = joinPath(tmpDir, "/toothrot.js");
        var componentFilePath = joinPath(tmpDir, "/components.js");
        var destination = fs.createWriteStream(outputPath);
        
        logger.info(
            "Bundling browser components for project in `" + dir + "` as `" + outputPath + "`..."
        );
        
        logger.log("Creating bootstrap file for browser in `" + tmpDir + "`...");
        
        if (!fs.existsSync(tmpDir)) {
            logger.log("Creating temporary folder `" + tmpDir + "`...");
            fs.mkdirSync(tmpDir);
        }
        
        ncp(modulesPath, joinPath(tmpDir, "/node_modules/"), function (error) {
            
            if (error) {
                logger.error(error);
                then(error);
                return;
            }
            
            componentFileContent = "module.exports = " + JSON.stringify(components, null, 4) + ";";
            
            componentFileContent = componentFileContent.replace(
                /"file":[^"]*(".*")/g,
                '"create": require($1).create'
            );
            
            fs.writeFileSync(componentFilePath, componentFileContent);
            fs.writeFileSync(appDestFilePath, fs.readFileSync(appSrcFilePath));
            
            destination.write(
                "/*\n" +
                "    Toothrot Engine (v" + package.version + ")\n" +
                "    Build time: " + (new Date().toUTCString()) + 
                "\n*/\n"
            );
            
            browserify(appDestFilePath).bundle(function (error, buffer) {
                
                if (error) {
                    logger.error(error);
                    then(error);
                    return;
                }
                
                destination.on("close", function () {
                    
                    maskBundlePaths(outputPath, components);
                    
                    logger.success("Browser component bundle written successfully.");
                    
                    logger.info("Removing temporary files...");
                    
                    rimraf(tmpDir, function (error) {
                        
                        if (error) {
                            logger.error(error);
                            then(error);
                            return;
                        }
                        
                        logger.success("Temporary files removed.");
                        then();
                    });
                });
                
                destination.write(buffer);
                destination.end();
                
            });
            
        });
    }
    
    //
    // We're removing the absolute file paths from our bundle to prevent leaking sensitive
    // information about a user's computer.
    //
    function maskBundlePaths(file, components) {
        
        var content = "" + fs.readFileSync(file);
        
        logger.log("Masking file paths in browser bundle...");
        
        Object.keys(components).forEach(function (key) {
            
            var component = components[key];
            
            var jsFileName = "<masked_path_" + Math.round(Math.random() * 1000000) + ">/" +
                getBaseName(component.file);
            
            var jsonFileName = "<masked_path_" + Math.round(Math.random() * 1000000) + ">/" +
                getBaseName(component.definitionFile);
            
            content = content.replace(
                new RegExp('"' + component.file + '"', "g"), '"' + jsFileName + '"'
            );
            
            content = content.replace(
                new RegExp("'" + component.file + "'", "g"), '"' + jsFileName + '"'
            );
            
            content = content.replace(
                new RegExp('"' + component.definitionFile + '"', "g"), '"' + jsonFileName + '"'
            );
            
            content = content.replace(
                new RegExp("'" + component.definitionFile + "'", "g"), '"' + jsonFileName + '"'
            );
        });
        
        fs.writeFileSync(file, content);
        
        logger.success("File paths in browser bundle masked successfully.");
    }
    
    function createTempFolderPath() {
        return joinPath(os.tmpdir(), "/toothrot_" + Math.round(Math.random() * 10000));
    }
    
    function build(dir, outputDir, buildDesktop, then) {
        
        var rawResources, resources, indexContent;
        
        var base = normalize((dir || process.cwd()) + "/");
        var buildDir = normalize(outputDir || (base + "build/"));
        var browserDir = joinPath(buildDir, "/browser/");
        var desktopDir = joinPath(buildDir, "/desktop/");
        var bundleFilePath = joinPath(browserDir, "/toothrot.js");
        var tmpDir = createTempFolderPath();
        var filesDir = joinPath(base, "/files/");
        var projectFile = joinPath(base, "/project.json");
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
        
            createBootstrapFile(base, bundleFilePath, function (error) {
                
                if (error) {
                    then(error);
                    return logger.error(error);
                }
                
                logger.info("Copying files from `" + filesDir + "` to `" + tmpDir + "`...");
                
                ncp(filesDir, tmpDir, function (error) {
                    
                    if (error) {
                        then(error);
                        return logger.error(error);
                    }
                    
                    logger.success("Files copied to `" + tmpDir + "`.");
                    
                    logger.info(
                        "Copying temporary directory contents to output folder `" +
                        browserDir + "`..."
                    );
                    
                    ncp(tmpDir, browserDir, function (error) {
                        
                        if (error) {
                            then(error);
                            return logger.error(error);
                        }
                        
                        logger.success("Files copied to `" + browserDir + "`.");
                        
                        logger.info("Removing temporary folder `" + tmpDir + "`...");
                        
                        rimraf(tmpDir, function (error) {
                            
                            if (error) {
                                logger.error(error);
                                return;
                            }
                            
                            logger.success(
                                "Successfully removed temporary folder `" + tmpDir + "`."
                            );
                        });
                        
                        try {
                            rawResources = packer.pack(base);
                        }
                        catch (error) {
                            
                            if (error.isToothrotError) {
                                then(error);
                                logger.error(error.toothrotMessage);
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
                        
                        logger.success("Toothrot project built successfully in: " + browserDir);
                        
                        createAppCacheFile(browserDir, function () {
                            
                            if (buildDesktop) {
                                
                                logger.log("Building desktop apps...");
                                
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
                                            logger.error("Cannot build desktop apps: " + error);
                                            return;
                                        }
                                        
                                        then(null);
                                        logger.success("Desktop apps build in: " + desktopDir);
                                    }
                                );
                            }
                            else {
                                then(null);
                            }
                        });
                        
                    });
                });
            });
            
        }
    }
    
    function buildDesktopApps(buildDir, config, then) {
        
        var options = merge({}, config);
        var package = require("electron-packager");
        var browserDir = joinPath(buildDir, "/browser/");
        var desktopDir = joinPath(buildDir, "/desktop/");
        var cacheDir = joinPath(os.homedir(), "/toothrot-cache/");
        
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
    
    function createAppCacheFile(dir, then) {
        
        var cacheFile = "" +
            "CACHE MANIFEST\n" +
            "# Timestamp: " + Date.now() + "\n" +
            "# Automatically created by Toothrot Engine\n" +
            "\n" +
            "CACHE:\n";
        
        var cacheFilePath = normalize(dir + "/cache.manifest");
        
        recurse(dir, function (error, files) {
            
            if (error) {
                then(error);
                return;
            }
            
            files.forEach(function (file) {
                cacheFile += normalizePath(file) + "\n";
            });
            
            fs.writeFileSync(cacheFilePath, cacheFile);
            
            logger.success("Created appcache file at: " + cacheFilePath);
            
            then();
        });
        
        function normalizePath(path) {
            return (path.split(dir)[1] || "").replace("\\", "/");
        }
    }
    
    function reportErrors(errors) {
        errors.forEach(function (error) {
            logger.error(error.toothrotMessage || error.message);
        });
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
