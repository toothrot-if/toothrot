#!/usr/bin/env node

/* global require, process */

var fs = require("fs");
var pack = require("../src/packer").pack;
var parse = require("../src/parser").parse;
var build = require("../src/builder").build;
var init = require("../src/initializer").init;
var args = process.argv;
var command = args[2];
var path = args[3];
var outputDir = args[4];

if (command === "build") {
    build(path, outputDir);
}
else if (command === "pack") {
    console.log(pack(path));
}
else if (command === "parse") {
    console.log(JSON.stringify(parse("" + fs.readFileSync(path)), null, 4));
}
else if (command === "init") {
    init(path || process.cwd());
}
else {
    console.log("Usage: build [inputDir] [outputDir]");
    console.log("Usage: pack [inputDir]");
    console.log("Usage: parse [storyFile]");
}
