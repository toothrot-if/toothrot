/* global require */

var fs = require("fs");
var browserify = require("browserify");

var outputFile = fs.createWriteStream("build/toothrot.js");
var bundle = browserify("src/index.js").bundle();

bundle.pipe(outputFile);
