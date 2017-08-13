/* global require, __dirname */
/* eslint-disable camelcase, no-console */

var fs = require("fs");
var path = require("path");
var ncp = require("ncp").ncp;

var resourceDir = path.normalize(__dirname + "/../resources/");

function getFolderName(dirPath) {
    
    var parts = path.normalize(dirPath).split(path.sep);
    
    parts.pop();
    
    return parts.pop();
}

function init(dir, then) {
    
    var name = getFolderName(dir) || "My Toothrot Engine Project";
    
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
        fs.mkdirSync(dir);
    }
    
    ncp(resourceDir, dir, function (error) {
        
        if (error) {
            then(error);
            return console.error(error);
        }
        
        fs.writeFileSync(path.normalize(dir + "/project.json"), JSON.stringify(project, null, 4));
        setStoryName();
        
        console.log("Initialized Toothrot Engine project '" + name + "' in " + dir + ".");
        then(null);
    });
    
    function setStoryName() {
        
        var file = path.normalize(dir + "/resources/story.trot.md");
        var story = "" + fs.readFileSync(file);
        
        story = story.replace(/^(\s*)#:([^\n]*)/g, "$1#: " + name);
        
        fs.writeFileSync(file, story);
    }
}

module.exports.init = init;
