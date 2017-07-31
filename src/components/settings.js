
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
    }
    
    function destroy() {
        storage = null;
    }
    
    function set(name, value) {
        settings[name] = value;
    }
    
    function get(name) {
        return settings[name];
    }
    
    function getAll() {
        
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
    
    function update(then) {
        
        var settingWidgets = screenContainer.querySelectorAll("*[data-type=setting]");
        
        [].forEach.call(settingWidgets, function (widget) {
            
            var name = widget.getAttribute("data-name");
            var value = widget.value;
            
            if (!name) {
                return;
            }
            
            set(name, value);
            
            context.emit("update_setting", name);
        });
        
        save(then);
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
        update: update,
        set: set,
        has: has,
        get: get,
        getAll: getAll
    };
    
}

module.exports = create;
