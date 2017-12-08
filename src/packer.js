/* global require, process */

var fs = require("fs");
var toDataUri = require("datauri").sync;
var normalize = require("path").normalize;

var parse = require("./parser").parse;
var readStoryFiles = require("./utils/readStoryFiles");

function pack(dir) {
    
    dir = dir || process.cwd();
    dir = normalize(dir + "/resources/");
    
    var story;
    var storyFilesContent;
    var templatePath = normalize(dir + "/templates/");
    var screenPath = normalize(dir + "/screens/");
    var imagePath = normalize(dir + "/images/");
    var astFile = normalize(dir + "/ast.json");
    var templateFiles = fs.readdirSync(templatePath);
    var screenFiles = fs.readdirSync(screenPath);
    var imageFiles = fs.readdirSync(imagePath);
    
    //
    // If there's an AST file in the resources folder (created by e.g. toothrot builder)
    // we use it instead of parsing the story file.
    //
    if (fs.existsSync(astFile)) {
        story = JSON.parse("" + fs.readFileSync(astFile));
    }
    else {
        storyFilesContent = readStoryFiles(dir);
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
        images: {},
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
    
    imageFiles.forEach(function (file) {
        
        var name = "images/" + file;
        
        bundle.images[name] = toDataUri(imagePath + file);
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

module.exports.pack = pack;
