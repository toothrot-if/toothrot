/* global require, process */

var normalize = require("path").normalize;
var parse = require("./parser").parse;
var fs = require("fs");

function pack(dir) {
    
    dir = dir || process.cwd();
    dir = normalize(dir + "/resources/");
    
    var story;
    var storyFilesContent;
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
        storyFilesContent = readStoryFile(dir);
        parse("" + storyFilesContent, function (errors, ast) {
            
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
    
    pruneStory(story);
    
    return JSON.stringify(bundle, null, 4);
}

function pruneStory(story) {
    
    Object.keys(story.nodes).forEach(function (key) {
        delete story.nodes[key].raw;
    });
    
    Object.keys(story.sections).forEach(function (key) {
        delete story.sections[key].raw;
    });
    
    delete story.head.content;
}

function readStoryFile(dir) {
    
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

module.exports.pack = pack;
