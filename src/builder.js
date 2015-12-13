/* global require */

var fs = require("fs");
var pack = require("./packer").pack;

function build (dir, outputDir) {
    
    var resources;
    var buildDir = outputDir || dir + "build/";
    
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }
    
    resources = pack(dir);
}

module.exports.build = build;
