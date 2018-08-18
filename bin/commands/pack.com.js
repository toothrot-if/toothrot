/* global process */

var fs = require("fs");

function create(context) {
    
    var packer, logger;
    
    function init() {
        logger = context.getInterface("logger", ["error"]);
        packer = context.getInterface("packer", ["pack"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        packer = null;
        logger = null;
    }
    
    function decorate(fn) {
        return function () {
            
            var commands = fn();
            
            commands.pack = {
                run: pack,
                brief: "packs the project resources into a resource file",
                usage: "[<path>]",
                description: "Packs raw resources of the project in <path> and outputs " +
                    "a JSON object containing the packed resources. If no <path> is given, " +
                    "the current working directory is used."
            };
            
            return commands;
        };
    }
    
    function pack(args) {
        
        var path = args.args[1] || process.cwd();
        
        packer.pack(fs, path, function (errors, storyPack) {
            
            if (errors) {
                
                if (Array.isArray(errors)) {
                    errors.forEach(function (error) {
                        logger.error(error.toothrotMessage || error.message);
                    });
                }
                else if (errors) {
                    logger.error(errors);
                }
                
                logger.error("Project resources could not be packed because of errors.");
            }
            else {
                console.log(storyPack); // eslint-disable-line no-console
            }
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
