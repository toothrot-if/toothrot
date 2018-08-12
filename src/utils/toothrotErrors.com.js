
function create(context) {
    
    var errors, format;
    
    var api = context.createInterface("toothrotErrors", {
        createError: createError
    });
    
    function init() {
        
        var getResource = context.channel("getResource");
        
        format = context.channel("getModule").call("vrep");
        errors = JSON.parse(getResource("toothrotErrors"));
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        errors = null;
        format = null;
        
        context.disconnectInterface(api);
    }
    
    function createError(error) {
        
        var id = error ? error.id : "[none given]";
        var message = format(errors[id] || "", error || {});
        var toothrotMessage = "\n    # Toothrot Error: " + id + "\n\n        -> " + message + "\n";
        
        if (!(id in errors)) {
            throw new Error("Unknown error ID: " + id);
        }
        
        return {
            message: message,
            isToothrotError: true,
            toothrotMessage: toothrotMessage,
            id: id,
            data: error
        };
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
