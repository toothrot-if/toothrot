/* global require, __dirname */

var fs = require("fs");
var path = require("path");
var ncp = require("ncp").ncp;

var resourceDir = path.normalize(__dirname + "/../resources/");
var engineSourceDir = path.normalize(__dirname + "/../build/");

function init (dir) {
    
    dir = path.normalize(dir + "/");
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    ncp(resourceDir, dir, function (error) {
        
        var sourceOutputDir = path.normalize(dir + "/engine/");
        
        if (error) {
            return console.error(error);
        }
        
        console.log("engineSourceDir:", engineSourceDir);
        console.log("sourceOutputDir:", sourceOutputDir);
        
        ncp(engineSourceDir, sourceOutputDir, function (error) {
            
            if (error) {
                return console.error(error);
            }
            
            console.log("Initialized empty Toothrot Engine project in " + dir + ".");
        });
        
    });
}

module.exports.init = init;
