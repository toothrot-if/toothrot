//
// # Script environment component
//
// The environment for scripts. It's available in scripts as: _
//

function create() {
    
    var env = {
        oneOf: function () {
            return arguments[Math.floor(Math.random() * arguments.length)];
        }
    };
    
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
        set: set,
        get: get,
        getAll: getAll,
        has: has
    }
}

module.exports = create;
