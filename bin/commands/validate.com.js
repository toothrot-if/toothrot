/* global process */

var fs = require("fs");
var joinPath = require("path").join;

function create(context) {
    
    var logger, parser, reader;
    
    function init() {
        logger = context.getInterface("logger", ["error", "success"]);
        parser = context.getInterface("parser", ["parse"]);
        reader = context.getInterface("storyFileReader", ["read"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        logger = null;
    }
    
    function decorate(fn) {
        return function () {
            
            var commands = fn();
            
            commands.validate = {
                run: validate,
                brief: "validates a story file",
                usage: "[<path>]",
                description: "Initializes a new project in <path>. " +
                    "If no <path> is given, the current working directory is used."
            };
            
            return commands;
        };
    }
    
    function validate(args) {
        
        var path = args.args[1] || process.cwd();
        var storyFiles = reader.read(fs, joinPath(path, "/resources/"));
        
        if (args.flags.json) {
            parser.parse(storyFiles, handleErrorsJson);
        }
        else {
            parser.parse(storyFiles, handleErrors);
        }
    }
    
    function handleErrorsJson(errors) {
        console.log( // eslint-disable-line no-console
            Array.isArray(errors) ?
                JSON.stringify(errors, null, 4) :
                []
        );
    }
    
    function handleErrors(errors) {
        if (errors) {
            if (Array.isArray(errors)) {
                errors.forEach(function (error) {
                    logger.error("\n" + (error.toothrotMessage || error.message));
                });
            }
            else {
                logger.error(errors);
            }
        }
        else {
            logger.success("Story files are valid!");
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
