
//
// Module for storing the game state in local storage.
//
// Savegames look like this:
//

/*
{
    name: "fooBarBaz", // a name. will be given by the engine
    time: 012345678    // timestamp - this must be set by the storage
    data: {}           // this is what the engine gives the storage
}
*/

var storageType, getItem, setItem, memoryStorage = Object.create(null);
var testStorageKey = "TOOTHROT-storage-test";

try {
    
    localStorage.setItem(testStorageKey, "works");
    
    if (localStorage.getItem(testStorageKey) === "works") {
        storageType = "local";
    }
}
catch (error) {
    // ...
}

if (!storageType) {
    
    try {
        
        sessionStorage.setItem(testStorageKey, "works");
        
        if (sessionStorage.getItem(testStorageKey) === "works") {
            storageType = "session";
        }
    }
    catch (error) {
        // ...
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


function storage (storageKey) {
    
    var none = function () {};
    
    storageKey = storageKey || "txe-savegames";
    
    function save (name, data, then) {
        
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
    
    function load (name, then) {
        
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
    
    function all (then) {
        
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
    
    function remove (name, then) {
        
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
        save: save,
        load: load,
        all: all,
        remove: remove
    };
}

module.exports = storage;
