
function create(context) {
    
    var vars;
    
    var api = context.createInterface("vars", {
        get: get,
        getAll: getAll,
        has: has,
        remove: remove,
        clear: clear,
        set: set,
        onResume: onResume
    });
    
    function init() {
        
        vars = {};
        context.on("resume_game", api.onResume);
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
        vars = null;
    }
    
    function onResume(data) {
        
        api.clear();
        
        Object.keys(data.vars).forEach(function (key) {
            vars[key] = data.vars[key];
        });
        
        context.publish("vars_resume");
    }
    
    function get(key) {
        return vars[key];
    }
    
    function remove(key) {
        delete vars[key];
    }
    
    function getAll() {
        return vars;
    }
    
    function set(key, value) {
        context.publish("before_set_var", key);
        vars[key] = value;
        context.publish("set_var", key);
    }
    
    function has(key) {
        return (key in vars);
    }
    
    function clear() {
        Object.keys(vars).forEach(function (key) {
            delete vars[key];
        });
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "vars",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["any"],
    create: create
};
