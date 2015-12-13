/* global require, Buffer */

var fs = require("fs");
var pack = require("./packer").pack;

function build (dir, outputDir) {
    
    var resources, indexContent;
    var buildDir = outputDir || dir + "build/";
    
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }
    
    resources = new Buffer(pack(dir)).toString("base64");
    
    indexContent = "(function () {" +
            "window.toothrotResources = '" + resources + "';" +
        "});";
    
    fs.writeFileSync(buildDir + "story.js", indexContent);
}

module.exports.build = build;
