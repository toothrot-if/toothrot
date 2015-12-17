/* global require, __dirname */

var fs = require("fs");
var path = require("path");
var ncp = require("ncp").ncp;

var resourceDir = path.normalize(__dirname + "/../resources/");

function init (dir) {
    
    dir = path.normalize(dir + "/");
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    ncp(resourceDir, dir, function (error) {
        
        if (error) {
            return console.error(error);
        }
        
        console.log("Initialized Toothrot Engine project in " + dir + ".");
        
    });
}

module.exports.init = init;
