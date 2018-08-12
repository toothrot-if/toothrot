/* global process, __dirname */
/* eslint-disable no-console */

var gatherer, fileContent;

var createFormatter = require("vrep").create;

var format = createFormatter("'{{$", "}}'", function (value) {
    return value;
});

var fs = require("fs");
var path = require("path");
var gathererDependencies = require("multiversum/utils/gatherer-context");
var createHost = require("multiversum/host").create;
var createGatherer = require("./src/gatherer.com").create;

var package = JSON.parse("" + fs.readFileSync(path.join(__dirname, "package.json")));
var runtimeTemplate = "" + fs.readFileSync(path.join(__dirname, "misc/templates/runtime.js"));
var resourcesTemplate = "" + fs.readFileSync(path.join(__dirname, "misc/templates/resources.js"));
var componentTemplate = "" + fs.readFileSync(path.join(__dirname, "misc/templates/component.js"));
var template = runtimeTemplate + resourcesTemplate;

var host = createHost();
var version = package.version;

host.connect("getModule", function (name) {
    return require(name);
});

gatherer = createGatherer(host);

gatherer.init();

fileContent = host.channel("toothrotGatherer/renderTemplate")(fs, template, componentTemplate, {
    paths: [process.cwd()],
    prepareHost: gathererDependencies.inject
});

console.log(format(fileContent, {
    version: version
}));
