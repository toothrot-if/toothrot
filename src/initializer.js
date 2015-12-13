/* global require, __dirname */

var fs = require("fs");
var ncp = require("ncp").ncp;

var resourceDir = __dirname + "../resources/";
var engineFile = __dirname + "../build/toothrot.js";

function init (dir) {
    
    if (fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    ncp(resourceDir, dir, function (error) {
        
        if (error) {
            return console.error(error);
        }
        
        fs.writeFileSync(dir + "engine/toothrot.js", fs.readFileSync(engineFile));
        
        console.log("Initialized empty Toothrot Engine project in " + dir + ".");
    });
}

module.exports.init = init;
