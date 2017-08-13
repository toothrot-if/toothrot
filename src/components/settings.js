
var clone = require("clone");

function none() {
    // does nothing
}

function create(context) {
    
    var storage, settings;
    
    function init() {
        
        storage = context.getComponent("storage");
        
        settings = {
            textSpeed: 50,
            soundVolume: 100,
            ambienceVolume: 100,
            musicVolume: 100
        };
        
        load();
    }
    
    function destroy() {
        storage = null;
    }
    
    function set(name, value) {
        settings[name] = value;
        context.emit("update_setting", name);
    }
    
    function remove(name) {
        delete settings[name];
        context.emit("remove_setting", name);
    }
    
    function get(name) {
        return settings[name];
    }
    
    function getAll() {
        return clone(settings);
    }
    
    function has(name) {
        return (name in settings);
    }
    
    function load(then) {
        
        then = then || none;
        
        storage.load("settings", function (error, data) {
            
            if (error) {
                return then(error);
            }
            
            if (!data) {
                storage.save("settings", settings.getAll(), function () {
                    then();
                });
            }
            else {
                mergeSettings(data.data);
                then();
            }
        });
    }
    
    function mergeSettings(other) {
        for (var key in other) {
            set(key, other[key]);
        }
    }
    
    function save(then) {
        
        then = then || none;
        
        storage.save("settings", getAll(), function () {
            then();
        });
    }
    
    return {
        init: init,
        destroy: destroy,
        load: load,
        save: save,
        update: mergeSettings,
        remove: remove,
        set: set,
        has: has,
        get: get,
        getAll: getAll
    };
    
}

module.exports = create;
