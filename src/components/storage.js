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
    
    var storageType, storageKey, getItem, setItem;
    var memoryStorage = Object.create(null);
    var testStorageKey = "TOOTHROT-storage-test";
    
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
        
        var story = context.getComponent("story");
        
        // Each story should have its own storage key so that
        // one story doesn't overwrite another story's savegames
        // and settings.
        storageKey = "TOOTHROT-" + story.getTitle();
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
            console.error(e);
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
            console.error(e);
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
            console.error(e);
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
            console.error(e);
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
        save: save,
        load: load,
        all: all,
        remove: remove
    };
}

module.exports = create;
