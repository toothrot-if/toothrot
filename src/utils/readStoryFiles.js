
var fs = require("fs");
var normalize = require("path").normalize;

function readStoryFiles(dir) {
    
    var mainFile = normalize(dir + "/story.trot.md");
    var content = "<<<story.trot.md>>>\n";
    var files = getAdditionalStoryFiles(dir);
    
    content += fs.readFileSync(mainFile);
    
    files.forEach(function (file) {
        
        var fileContent = fs.readFileSync(normalize(dir + "/" + file));
        
        content += "<<<" + file + ">>>\n";
        content += fileContent;
    });
    
    return content;
}

function getAdditionalStoryFiles(dir) {
    
    var allFiles = fs.readdirSync(dir);
    
    return allFiles.filter(function (file) {
        return (/\.trot\.ext\.md/).test(file);
    });
}

module.exports = readStoryFiles;
