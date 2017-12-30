//
// # Script environment component
//
// The environment for scripts. It's available in scripts as: _
//

function create(context) {
    
    var env = {
        oneOf: function () {
            return arguments[Math.floor(Math.random() * arguments.length)];
        },
        save: function (savegameId, then) {
            setTimeout(function () {
                context.getComponent("interpreter").save(savegameId, then || function () {});
            }, 20);
        },
        load: function (savegameId, then) {
            setTimeout(function () {
                context.getComponent("interpreter").load(savegameId, then || function () {});
            }, 20);
        }
    };
    
    function init() {
        
        var _ = context.get("_");
        
        Object.keys(_).forEach(function (key) {
            set(key, _[key]);
        });
    }
    
    function destroy() {
        env = null;
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
        destroy: destroy,
        set: set,
        get: get,
        getAll: getAll,
        has: has
    };
}

module.exports = create;
