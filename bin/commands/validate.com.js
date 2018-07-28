
var fs = require("fs");

function create(context) {
    
    var validator, logger;
    
    function init() {
        logger = context.getInterface("logger", ["error", "success"]);
        validator = context.getInterface("validator", ["validate"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        validator = null;
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
        
        var path = args.args[1];
        
        validateAst(JSON.parse("" + fs.readFileSync(path)));
    }
    
    function reportErrors(errors) {
        errors.forEach(function (error) {
            logger.error(error.toothrotMessage || error.message);
        });
    }
    
    function validateAst(ast) {
        
        var errors = [];
        
        validator.createValidator(collect).validate(ast);
        
        if (errors.length) {
            reportErrors(errors);
        }
        else {
            logger.success("No errors found! :)");
        }
        
        function collect(error) {
            errors.push(error);
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
