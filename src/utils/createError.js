
var format = require("vrep").format;
var errors = require("./errors");

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

module.exports = createError;
