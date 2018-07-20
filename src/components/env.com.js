//
// # Script environment component
//
// The environment for scripts. It's available in scripts as: _
//

function create(context) {
    
    var env;
    
    var api = context.createInterface("env", {
        get: get,
        has: has,
        set: set,
        getAll: getAll,
        createEnvObject: createEnvObject
    });
    
    function init() {
        context.connectInterface(api);
        env = api.createEnvObject();
    }
    
    function destroy() {
        env = null;
        context.disconnectInterface(api);
    }
    
    function createEnvObject() {
        return {
            oneOf: function () {
                return arguments[Math.floor(Math.random() * arguments.length)];
            },
            save: function (savegameId, then) {
                setTimeout(function () {
                    context.channel("interpreter/save").call(savegameId, then || function () {});
                }, 20);
            },
            load: function (savegameId, then) {
                setTimeout(function () {
                    context.channel("interpreter/load").call(savegameId, then || function () {});
                }, 20);
            }
        };
    }
    
    function set(key, value) {
        env[key] = value;
    }
    
    function get(key) {
        return env[key];
    }
    
    function has(key) {
        return (key in env);
    }
    
    function getAll() {
        return env;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
