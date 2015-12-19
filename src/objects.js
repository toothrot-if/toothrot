/* global require, module */

var format = require("vrep").format;
var merge = require("deepmerge");

function assemble (name, objects) {
    
    var obj = {};
    var prototypes = (objects[name].prototypes || []).slice();
    
    prototypes.forEach(function (p) {
        obj = merge(obj, assemble(p, objects));
    });
    
    obj.properties = {};
    
    return merge(obj, objects[name]);
}

function assembleAll (objects) {
    
    var key, all = {};
    
    for (key in objects) {
        all[key] = assemble(key, objects);
    }
    
    return all;
}

function create (name, obj, putLink) {
    
    var printLabel = obj.label || name;
    
    var out = {
        add: add,
        drop: drop,
        is: is,
        print: print,
        put: put,
        property: property,
        label: label
    };
    
    function label (newLabel) {
        
        if (newLabel) {
            obj.label = newLabel;
            printLabel = newLabel;
        }
        
        return obj.label;
    }
    
    function print (text) {
        return putLink(text || printLabel, put(), undefined, undefined, name);
    }
    
    function put () {
        
        var actions = {};
        
        obj.activeAspects.forEach(function (aspect) {
            for (var key in obj.aspects[aspect]) {
                actions[key] = format(obj.aspects[aspect][key], {name: name});
            }
        });
        
        return actions;
    }
    
    function is (aspect) {
        return obj.activeAspects.indexOf(aspect) >= 0;
    }
    
    function add (aspect) {
        
        if (!(aspect in obj.aspects)) {
            throw new Error("No such aspect in object '" + name + "': " + aspect);
        }
        
        if (obj.activeAspects.indexOf(aspect) < 0) {
            obj.activeAspects.push(aspect);
        }
        
        return out;
    }
    
    function drop (aspect) {
        
        var index = obj.activeAspects.indexOf(aspect);
        
        if (index >= 0) {
            obj.activeAspects.splice(index, 1);
        }
        
        return out;
    }
    
    function property (key, value) {
        
        if (arguments.length > 1) {
            obj.properties[key] = value;
        }
        
        return obj.properties[key];
    }
    
    return out;
}

function find (name, objects) {
    
    if (!objects[name]) {
        throw new Error("Unknown object: " + name);
    }
    
    return objects[name];
}

module.exports = {
    assemble: assemble,
    assembleAll: assembleAll,
    create: create,
    find: find
};
