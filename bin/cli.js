#!/usr/bin/env node

/* global require, process */

var fs = require("fs");
var colors = require("colors");

var pack = require("../src/packer").pack;
var parse = require("../src/parser").parse;
var build = require("../src/builder").build;
var init = require("../src/initializer").init;
var validator = require("../src/validator");

var args = process.argv;
var command = args[2];
var path = args[3];
var outputDir = args[4];

if (command === "build") {
    build(path, outputDir, false);
}
else if (command === "build-desktop") {
    build(path, outputDir, true);
}
else if (command === "pack") {
    console.log(pack(path));
}
else if (command === "parse") {
    parse("" + fs.readFileSync(path), function (errors, result) {
        if (errors) {
            reportErrors(errors);
        }
        else {
            console.log(JSON.stringify(result, null, 4));
        }
    });
}
else if (command === "init") {
    init(path || process.cwd());
}
else if (command === "validate") {
    validate(JSON.parse("" + fs.readFileSync(path)));
}
else {
    console.log("Usage: build [inputDir] [outputDir]");
    console.log("Usage: pack [inputDir]");
    console.log("Usage: parse [storyFile]");
}

function reportErrors (errors) {
    errors.forEach(function (error) {
        console.error(colors.red(error.toothrotMessage || error.message));
    });
}

function validate (ast) {
    
    var errors = [];
    
    validator(collect).validate(ast);
    
    if (errors.length) {
        reportErrors(errors);
    }
    else {
        console.log(colors.green("No errors found! :)"));
    }
    
    function collect (error) {
        errors.push(error);
    }
}
