/* global require, Buffer, process */

function create(context) {
    
    var logger, packer, joinPath, normalize, gatherer, fsHelper, scriptExporter;
    
    var api = context.createInterface("builder", {
        build: build,
        createAppCacheFile: createAppCacheFile,
        reportErrors: reportErrors
    });
    
    function init() {
        
        var getModule = context.channel("getModule");
        var path = getModule("path");
        
        joinPath = path.join;
        normalize = path.normalize;
        
        logger = context.getInterface("logger", ["log", "error", "info", "success"]);
        packer = context.getInterface("packer", ["pack"]);
        gatherer = context.getInterface("toothrotGatherer", ["renderTemplate"]);
        scriptExporter = context.getInterface("scriptExporter", ["render"]);
        
        fsHelper = context.getInterface("fileSystem", [
            "copyAll",
            "removeRecursive",
            "readDirRecursive"
        ]);
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        logger = null;
        packer = null;
        gatherer = null;
        scriptExporter = null;
        
        context.disconnectInterface(api);
    }
    
    function gathererDependencyInjector(fs) {
        
        var getModule = context.channel("getModule");
        
        var modules = {
            fs: fs,
            assert: getModule("assert"),
            semver: getModule("semver"),
            minimatch: getModule("minimatch")
        };
        
        return function (host) {
            host.decorate("getModule", function (fn) {
                return function (name) {
                    
                    var result = fn(name);
                    
                    if (result) {
                        return result;
                    }
                    
                    return name in modules ? modules[name] : getModule(name);
                };
            });
        };
    }
    
    function gatherComponents(fs, dir) {
        
        var componentFile, template, componentTemplate;
        var getResource = context.channel("getResource");
        
        logger.info("Gathering components in `" + dir + "`...");
        
        template = getResource("toothrotResourcesTemplate");
        componentTemplate = getResource("toothrotComponentTemplate");
        
        componentFile = gatherer.renderTemplate(fs, template, componentTemplate, {
            paths: [dir],
            prepareHost: gathererDependencyInjector(fs)
        });
        
        logger.success("Component gathering completed.");
        
        return componentFile;
    }
    
    function createBootstrapFiles(inputFs, dir, outputFs, outputPath) {
        
        var runtimePath = joinPath(dir, "toothrot.js");
        var componentFileContent = gatherComponents(inputFs, dir);
        var appDestFilePath = joinPath(outputPath, "/toothrot.js");
        var componentFilePath = joinPath(outputPath, "/components.js");
        
        logger.info(
            "Bundling browser components for project in `" + dir + "`..."
        );
        
        logger.log("Creating bootstrap file for browser in `" + outputPath + "`...");
        
        if (!outputFs.existsSync(outputPath)) {
            logger.log("Creating temporary folder `" + outputPath + "`...");
            outputFs.mkdirSync(outputPath);
        }
        
        outputFs.writeFileSync(appDestFilePath, inputFs.readFileSync(runtimePath));
        outputFs.writeFileSync(componentFilePath, componentFileContent);
        
        logger.success("Browser component bundle written successfully.");
        
    }
    
    function build(inputFs, dir, outputFs, outputDir, then) {
        
        var rawResources, resources, indexContent, story;
        
        var base = normalize((dir || process.cwd()) + "/");
        var buildDir = normalize(outputDir || (base + "build/"));
        var browserDir = joinPath(buildDir, "/browser/");
        var scriptFilePath = joinPath(browserDir, "/scripts.js");
        var filesDir = joinPath(base, "/files/");
        var projectFile = joinPath(base, "/project.json");
        var project = JSON.parse("" + inputFs.readFileSync(projectFile));
        
        then = then || function () {};
        
        if (!outputFs.existsSync(buildDir)) {
            outputFs.mkdirSync(buildDir);
        }
        
        if (outputFs.existsSync(browserDir)) {
            fsHelper.removeRecursive(outputFs, browserDir);
        }
        
        outputFs.mkdirSync(browserDir);
        
        createBootstrapFiles(inputFs, base, outputFs, browserDir);
        
        logger.info("Copying files from `" + filesDir + "` to `" + browserDir + "`...");
        
        fsHelper.copyAll(inputFs, filesDir, outputFs, browserDir);
        
        logger.success("Files copied to `" + browserDir + "`.");
        
        try {
            rawResources = packer.pack(inputFs, base);
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
        
        story = JSON.parse(rawResources).story;
        project.name = story.meta.title || project.name;
        resources = new Buffer(encodeURIComponent(rawResources)).toString("base64");
        
        indexContent = "(function () {\n" +
                "    var toothrotResources = '" + resources + "';\n" +
                '    TOOTHROT.decorate("getResource", function (fn) {\n' +
                "        return function (name) {\n" +
                "            var result = fn(name);\n" +
                "            if (result) { return result; }\n" +
                '            return name === "toothrotResources" ? toothrotResources : null;\n' +
                "        };\n" +
                '    });\n' +
            "}());";
        
        outputFs.writeFileSync(joinPath(browserDir, "resources.js"), indexContent);
        outputFs.writeFileSync(scriptFilePath, scriptExporter.render(story));
        outputFs.writeFileSync(projectFile, JSON.stringify(project, null, 4));
        
        logger.success("Toothrot project built successfully in: " + browserDir);
        
        createAppCacheFile(outputFs, browserDir, then);
        
    }
    
    function createAppCacheFile(fs, dir, then) {
        
        var cacheFile = "" +
            "CACHE MANIFEST\n" +
            "# Timestamp: " + Date.now() + "\n" +
            "# Automatically created by Toothrot Engine\n" +
            "\n" +
            "CACHE:\n";
        
        var cacheFilePath = normalize(dir + "/cache.manifest");
        var files = fsHelper.readDirRecursive(fs, dir);
        
        files.forEach(function (file) {
            cacheFile += normalizePath(file) + "\n";
        });
        
        fs.writeFileSync(cacheFilePath, cacheFile);
        
        logger.success("Created appcache file at: " + cacheFilePath);
        
        then();
        
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
