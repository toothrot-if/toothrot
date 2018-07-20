//
// Module for storing the game state in local storage.
//
// Savegames look like this:
//
//
// {
//     name: "fooBarBaz", // a name. will be given by the engine
//     time: 012345678    // timestamp - this must be set by the storage
//     data: {}           // this is what the engine gives the storage
// }

var none = function () {};

function create(context) {
    
    var storageType, storageKey, getItem, setItem, logger;
    var memoryStorage = Object.create(null);
    var testStorageKey = "TOOTHROT-storage-test";
    
    var api = context.createInterface("storage", {
        save: save,
        load: load,
        all: all,
        remove: remove,
        getStorageKey: getStorageKey
    });
    
    try {
        
        localStorage.setItem(testStorageKey, "works");
        
        if (localStorage.getItem(testStorageKey) === "works") {
            storageType = "local";
        }
    }
    catch (error) {
        console.warn(error);
    }
    
    if (!storageType) {
        
        try {
            
            sessionStorage.setItem(testStorageKey, "works");
            
            if (sessionStorage.getItem(testStorageKey) === "works") {
                storageType = "session";
            }
        }
        catch (error) {
            console.warn(error);
        }
    }
    
    if (!storageType) {
        storageType = "memory";
    }
    
    if (storageType === "local") {
        
        getItem = function (name) {
            return JSON.parse(localStorage.getItem(name) || "{}");
        };
        
        setItem = function (name, value) {
            return localStorage.setItem(name, JSON.stringify(value));
        };
    }
    else if (storageType === "session") {
        
        getItem = function (name) {
            return JSON.parse(sessionStorage.getItem(name) || "{}");
        };
        
        setItem = function (name, value) {
            return sessionStorage.setItem(name, JSON.stringify(value));
        };
    }
    else {
        
        getItem = function (name) {
            return JSON.parse(memoryStorage[name] || "{}");
        };
        
        setItem = function (name, value) {
            return memoryStorage[name] = JSON.stringify(value);
        };
    }
    
    function init() {
        
        context.connectInterface(api);
        
        logger = context.getInterface("logger", ["log", "error"]);
        
        // Each story should have its own storage key so that
        // one story doesn't overwrite another story's savegames
        // and settings.
        storageKey = api.getStorageKey();
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function getStorageKey() {
        
        var story = context.getInterface("story", ["getTitle"]);
        
        return "TOOTHROT-" + story.getTitle();
    }
    
    function save(name, data, then) {
        
        var store, error;
        
        then = then || none;
        
        try {
            
            store = getItem(storageKey);
            
            store[name] = {
                name: name,
                time: Date.now(),
                data: data
            };
            
            setItem(storageKey, store);
            
        }
        catch (e) {
            logger.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, true);
    }
    
    function load(name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey)[name];
        }
        catch (e) {
            logger.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function all(then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            logger.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function remove(name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            logger.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        delete value[name];
        
        setItem(storageKey, value);
        
        then(null, true);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "storage",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["browser"],
    create: create
};
