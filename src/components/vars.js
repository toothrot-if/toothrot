
function create(context) {
    
    var vars;
    
    function init() {
        vars = {};
        context.on("resume_game", onResume);
    }
    
    function destroy() {
        vars = null;
    }
    
    function onResume(data) {
        
        clear();
        
        Object.keys(data.vars).forEach(function (key) {
            vars[key] = data.vars[key];
        });
        
        context.emit("vars_resume");
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
        context.emit("before_set_var", key);
        vars[key] = value;
        context.emit("set_var", key);
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
        destroy: destroy,
        get: get,
        getAll: getAll,
        remove: remove,
        set: set,
        has: has,
        clear: clear
    };
}

module.exports = create;
