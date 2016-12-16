/* global require, __dirname */
/* eslint-disable camelcase, no-console */

var fs = require("fs");
var path = require("path");
var ncp = require("ncp").ncp;

var resourceDir = path.normalize(__dirname + "/../resources/");

function init (dir, then) {
    
    var project = {
        name: "My Toothrot Engine Project",
        version: "0.1.0",
        electron: {
            platform: ["darwin", "linux", "win32"],
            version: "1.4.12"
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
        
        console.log("Initialized Toothrot Engine project in " + dir + ".");
        then(null);
    });
}

module.exports.init = init;
