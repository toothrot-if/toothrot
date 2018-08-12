/* global require, __dirname */
/* eslint-disable camelcase */

function create(context) {
    
    var logger, path, resourceDir, fsHelper;
    
    var api = context.createInterface("initializer", {
        getFolderName: getFolderName,
        init: initProject
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        path = getModule("path");
        logger = context.getInterface("logger", ["log", "error", "info", "success"]);
        fsHelper = context.getInterface("fileSystem", ["copyAll"]);
        resourceDir = path.join(__dirname, "/../resources/");
        
        context.connectInterface(api);
    }
    
    function destroy() {
        logger = null;
        context.disconnectInterface(api);
    }
    
    function getFolderName(dirPath) {
        
        var parts = path.normalize(dirPath + "/").split(path.sep);
        
        parts.pop();
        
        return parts.pop();
    }
    
    function initProject(fs, dir, then) {
        
        var name = getFolderName(dir) || "My Toothrot Engine Project";
        
        logger.info("Initializing new toothrot project `" + name + "` in `" + dir + "`...");
        
        var project = {
            name: name,
            version: "0.1.0",
            electron: {
                platform: ["darwin", "linux", "win32"],
                version: "1.7.5",
                asar: true,
                overwrite: true,
                prune: false,
                tmpdir: false
            }
        };
        
        then = then || function () {};
        dir = path.normalize(dir + "/");
        
        if (!fs.existsSync(dir)) {
            logger.log("Directory `" + dir + "` doesn't exist; creating...");
            fs.mkdirSync(dir);
        }
        
        logger.info("Copying required resources...");
        
        fsHelper.copyAll(fs, resourceDir, fs, dir);
        
        fs.writeFileSync(
            path.join(dir, "toothrot.js"),
            fs.readFileSync(path.join(__dirname, "../build", "toothrot.js"))
        );
        
        logger.success("Resources copied.");
        logger.log("Creating `project.json` file...");
        
        fs.writeFileSync(
            path.normalize(dir + "/project.json"), JSON.stringify(project, null, 4)
        );
        
        logger.log("Setting story title to project name...");
        
        setStoryName();
        
        logger.success("Initialized Toothrot Engine project '" + name + "' in " + dir + ".");
        
        then(null);
        
        function setStoryName() {
            
            var file = path.normalize(dir + "/resources/story.trot.md");
            var story = "" + fs.readFileSync(file);
            
            story = story.replace(/^(\s*)#([^\n]*)/g, "$1# " + name);
            
            fs.writeFileSync(file, story);
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
