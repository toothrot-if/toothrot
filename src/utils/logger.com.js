
function create(context) {
    
    var colors;
    
    var api = context.createInterface("logger", {
        log: log,
        error: logError,
        info: logInfo,
        warn: warn,
        success: logSuccess
    });
    
    function init() {
        colors = context.channel("getModule").call("colors");
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function getTimeString() {
        // @ts-ignore
        return colors.grey("[" + (new Date()).toLocaleTimeString() + "]");
    }
    
    function log() {
        
        var args = Array.prototype.slice.call(arguments);
        
        args.unshift(getTimeString());
        
        console.log.apply(console, args); // eslint-disable-line no-console
    }
    
    function warn() {
        
        var args = Array.prototype.slice.call(arguments).map(function (message) {
            // @ts-ignore
            return colors.yellow(message);
        });
        
        args.unshift(getTimeString());
        
        console.warn.apply(null, args);
    }
    
    function logError() {
        
        var args = Array.prototype.slice.call(arguments).map(function (message) {
            // @ts-ignore
            return colors.red(message);
        });
        
        args.unshift(getTimeString());
        
        console.error.apply(null, args);
    }
    
    function logSuccess() {
        
        var args = Array.prototype.slice.call(arguments).map(function (message) {
            // @ts-ignore
            return colors.green(message);
        });
        
        args.unshift(getTimeString());
        
        console.log.apply(null, args); // eslint-disable-line no-console
    }
    
    function logInfo() {
        
        var args = Array.prototype.slice.call(arguments).map(function (message) {
            // @ts-ignore
            return colors.blue(message);
        });
        
        args.unshift(getTimeString());
        
        console.log.apply(null, args); // eslint-disable-line no-console
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
