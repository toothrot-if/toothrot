
function create(context) {
    
    var vars;
    
    function init() {
        vars = {};
    }
    
    function destroy() {
        vars = null;
    }
    
    function get(key) {
        return vars[key];
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
        set: set,
        has: has,
        clear: clear
    };
}

module.exports = create;
