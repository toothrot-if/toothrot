/* global process */

var fs = require("fs");
var joinPath = require("path").join;

function create(context) {
    
    var parser, logger, reader;
    
    function init() {
        parser = context.getInterface("parser", ["parse"]);
        logger = context.getInterface("logger", ["error"]);
        reader = context.getInterface("storyFileReader", ["read"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        parser = null;
        logger = null;
    }
    
    function decorate(fn) {
        return function () {
            
            var commands = fn();
            
            commands.parse = {
                run: parse,
                brief: "parses a story file",
                usage: "[<path>]",
                description: "Parses the story file at <path>. " +
                    "If no <path> is given, the current working directory is used."
            };
            
            return commands;
        };
    }
    
    function parse(args) {
        
        var storyFiles;
        var path = joinPath(args.args[1] || process.cwd(), "/resources/");
        
        if (!path || typeof path !== "string") {
            logger.error("No path specified for `parse` command!");
            return;
        }
        
        storyFiles = reader.read(fs, path);
        
        parser.parse(storyFiles, function (errors, result) {
            if (errors) {
                reportErrors(errors);
            }
            else {
                console.log(JSON.stringify(result, null, 4)); // eslint-disable-line no-console
            }
        });
    }
    
    function reportErrors(errors) {
        errors.forEach(function (error) {
            logger.error(error.toothrotMessage || error.message);
        });
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
