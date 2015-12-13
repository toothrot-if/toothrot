/* global require */

var parse = require("./parser").parse;
var fs = require("fs");

function pack (dir) {
    
    console.log(dir);
    
    var templatePath = dir + "templates/";
    var screenPath = dir + "screens/";
    var templateFiles = fs.readdirSync(templatePath);
    var screenFiles = fs.readdirSync(screenPath);
    var story = parse("" + fs.readFileSync(dir + "story.md"));
    
    var bundle = {
        templates: {},
        screens: {},
        story: story
    }
    
    templateFiles.forEach(function (file) {
        
        var name = file.split(".")[0];
        
        bundle.templates[name] = "" + fs.readFileSync(templatePath + file);
    });
    
    screenFiles.forEach(function (file) {
        
        var name = file.split(".")[0];
        
        bundle.screens[name] = "" + fs.readFileSync(screenPath + file);
    });
    
    return JSON.stringify(bundle, null, 4);
}

module.exports.pack = pack;
