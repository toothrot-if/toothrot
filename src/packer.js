/* global require, process */

var normalize = require("path").normalize;
var parse = require("./parser").parse;
var fs = require("fs");

function pack (dir) {
    
    dir = dir || process.cwd();
    dir = normalize(dir + "/resources/");
    
    var templatePath = normalize(dir + "/templates/");
    var screenPath = normalize(dir + "/screens/");
    var templateFiles = fs.readdirSync(templatePath);
    var screenFiles = fs.readdirSync(screenPath);
    var story = parse("" + fs.readFileSync(normalize(dir + "/story.md")));
    var objects = JSON.parse("" + fs.readFileSync(normalize(dir + "/objects.json")));
    
    var bundle = {
        meta: {
            buildTime: Date.now()
        },
        templates: {},
        screens: {},
        story: story,
        objects: objects
    };
    
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
