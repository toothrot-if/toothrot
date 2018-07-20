/* eslint-disable no-console */

function create(context) {
    
    context.decorate(function (fn, info) {
        
        var channel = info.channel;
        
        return function () {
            logMessage("Calling channel `" + channel + "` with:\n\n", arguments);
            return fn.apply(null, arguments);
        };
    });
    
    context.decorate("app/publish", function (fn) {
        return function (messageName, data) {
            logMessage("Publishing message `" + messageName + "` with:\n\n", data || "<none>");
            return fn.apply(null, arguments);
        };
    });
    
}

function logMessage(message, data) {
    console.log("");
    console.log("------------------");
    console.log("");
    console.log("[" + new Date().toTimeString() + "] " + message, data);
}

module.exports = {
    create: create
};
