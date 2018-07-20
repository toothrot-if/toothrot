
var fs = require("fs");

function create(context) {
    
    var parser, logger;
    
    function init() {
        parser = context.getInterface("parser", ["parse"]);
        logger = context.getInterface("logger", ["error"]);
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
        
        var path = args.args[1];
        
        if (!path || typeof path !== "string") {
            logger.error("No path specified for `parse` command!");
            return;
        }
        
        parser.parse("" + fs.readFileSync(path), function (errors, result) {
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
