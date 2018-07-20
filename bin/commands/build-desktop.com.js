
function create(context) {
    
    var builder;
    
    function init() {
        builder = context.getInterface("builder", ["build"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        builder = null;
    }
    
    function decorate(fn) {
        return function () {
            
            var commands = fn();
            
            commands["build-desktop"] = {
                run: build,
                brief: "builds project for desktop",
                usage: "[<path>] [<outputPath>]",
                description: "Builds the project in <path> and puts the result into <outputPath>." +
                    " Also builds desktop apps and puts them in <outputPath>." +
                    " If no paths are given, the current working directory is used instead."
            };
            
            return commands;
        };
    }
    
    function build(args) {
        
        var path = args.args[1];
        var outputDir = args.args[2];
        
        builder.build(path, outputDir, true);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
