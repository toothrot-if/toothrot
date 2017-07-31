//
// # Script environment component
//
// The environment for scripts. It's available in scripts as: _
//

function create() {
    
    var vars;
    
    var env = {
        link: function (label, target) {
            return insertLink(label, target);
        },
        o: function (name) {
            return objects.create(name, objects.find(name, vars._objects));
        },
        createObject: function (name, prototypes) {
            
            vars._objects[name] = {
                prototypes: prototypes
            };
            
            vars._objects[name] = objects.assemble(name, vars._objects);
        },
        oneOf: function () {
            return arguments[Math.floor(Math.random() * arguments.length)];
        }
    };
    
    function init() {
        
    }
    
    function destroy() {
        
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
    
    return {
        init: init,
        destroy: destroy,
        set: set,
        get: get,
        has: has
    }
}

module.exports = create;
