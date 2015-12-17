/* global require */

var fs = require("fs");
var browserify = require("browserify");

var outputFile = fs.createWriteStream("build/toothrot.js");
var bundle = browserify("src/index.js").bundle();
var info = JSON.parse("" + fs.readFileSync("package.json"));

outputFile.write(
    "/*\n" +
    "    Toothrot Engine (v" + info.version + ")\n" +
    "    Build time: " + (new Date().toUTCString()) + 
    "\n*/\n"
);

bundle.pipe(outputFile);
