/* global process */

function create(context) {
    
    var initializer;
    
    function init() {
        initializer = context.getInterface("initializer", ["init"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        initializer = null;
    }
    
    function decorate(fn) {
        return function () {
            
            var commands = fn();
            
            commands.init = {
                run: runInit,
                brief: "initializes a new project",
                usage: "[<path>]",
                description: "Initializes a new project in <path>. " +
                    "If no <path> is given, the current working directory is used."
            };
            
            return commands;
        };
    }
    
    function runInit(args) {
        
        var path = args.args[1];
        
        initializer.init(path || process.cwd());
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
