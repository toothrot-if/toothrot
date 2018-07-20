
function create(context) {
    
    var packer;
    
    function init() {
        packer = context.getInterface("packer", ["pack"]);
        context.decorate("cli/getCommands", decorate);
    }
    
    function destroy() {
        context.removeDecorator("cli/getCommands", decorate);
        packer = null;
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
        
        var path = args.args[1];
        
        console.log(packer.pack(path)); // eslint-disable-line no-console
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
