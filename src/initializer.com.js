/* global require, __dirname */
/* eslint-disable camelcase */

var fs = require("fs");
var path = require("path");
var ncp = require("ncp").ncp;

var resourceDir = path.normalize(__dirname + "/../resources/");

function create(context) {
    
    var logger;
    
    var api = context.createInterface("initializer", {
        getFolderName: getFolderName,
        init: initProject
    });
    
    function init() {
        logger = context.getInterface("logger", ["log", "error", "info", "success"]);
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
    
    function initProject(dir, then) {
        
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
        
        ncp(resourceDir, dir, function (error) {
            
            if (error) {
                then(error);
                return logger.error(error);
            }
            
            logger.success("Resources copied.");
            logger.log("Creating `project.json` file...");
            
            fs.writeFileSync(
                path.normalize(dir + "/project.json"), JSON.stringify(project, null, 4)
            );
            
            logger.log("Setting story title to project name...");
            
            setStoryName();
            
            logger.success("Initialized Toothrot Engine project '" + name + "' in " + dir + ".");
            then(null);
        });
        
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
