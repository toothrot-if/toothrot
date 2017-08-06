/* global require, process */

var normalize = require("path").normalize;
var parse = require("./parser").parse;
var fs = require("fs");

function pack(dir) {
    
    dir = dir || process.cwd();
    dir = normalize(dir + "/resources/");
    
    var story;
    var templatePath = normalize(dir + "/templates/");
    var screenPath = normalize(dir + "/screens/");
    var astFile = normalize(dir + "/ast.json");
    var templateFiles = fs.readdirSync(templatePath);
    var screenFiles = fs.readdirSync(screenPath);
    
//
// If there's an AST file in the resources folder (created by e.g. toothrot builder)
// we use it instead of parsing the story file.
//
    if (fs.existsSync(astFile)) {
        story = JSON.parse("" + fs.readFileSync(astFile));
    }
    else {
        parse("" + fs.readFileSync(normalize(dir + "/story.md")), function (errors, ast) {
            
            if (errors) {
                throw errors;
            }
            
            story = ast;
        });
    }
    
    var bundle = {
        meta: {
            buildTime: Date.now()
        },
        templates: {},
        screens: {},
        story: story
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
