/* eslint-disable no-console */

var EventEmitter = require("events");

//
// # Context
//
// The context is an object that is given to components which they can use to interact
// with the rest of the engine.
//
function create(options) {
    
    var privateContext, resources;
    
    var bus = new EventEmitter();
    var vars = Object.create(null);
    var components = Object.create(null);
    var componentFactories = Object.create(null);
    
    options = options || {};
    options.components = options.components || {};
    resources = options.resources || {};
    
    Object.keys(options.components).forEach(function (key) {
        componentFactories[key] = options.components[key];
    });
    
    function init() {
        Object.keys(componentFactories).forEach(function (key) {
            getComponent(key);
        });
    }
    
    function destroy() {
        
        Object.keys(components).forEach(function (key) {
            
            var component = getComponent(key);
            
            if (component.destroy) {
                component.destroy();
            }
        });
        
        bus = null;
        vars = null;
        components = null;
        componentFactories = null;
    }
    
    function set(name, value) {
        vars[name] = value;
    }
    
    function get(name) {
        return vars[name];
    }
    
    function has(name) {
        return (name in vars);
    }
    
    function keys() {
        return Object.keys(vars);
    }
    
    function hasComponent(name) {
        return !!componentFactories[name];
    }
    
    function registerComponent(name, component) {
        
        if (hasComponent(name)) {
            throw new Error("Component '" + name + "' is already registered.");
        }
        
        componentFactories[name] = component;
        
        bus.emit("register_component", name);
    }
    
    function getComponent(name) {
        
        if (!componentFactories[name]) {
            throw new Error("No such component: " + name);
        }
        
        if (!components[name]) {
            
            console.log("Initializing component '" + name + "'...");
            
            components[name] = componentFactories[name]();
            
            if (components[name].init) {
                components[name].init();
            }
        }
        
        return components[name];
    }
    
    function getResource(name) {
        return resources[name];
    }
    
    function hasResource(name) {
        return (name in resources);
    }
    
    function createPublicContext() {
        
        var publicContext = {
            set: set,
            get: get,
            has: has,
            keys: keys,
            getComponent: getComponent,
            hasComponent: hasComponent,
            getResource: getResource,
            hasResource: hasResource,
            emit: bus.emit.bind(bus),
            once: bus.once.bind(bus),
            on: bus.on.bind(bus),
            removeListener: bus.removeListener.bind(bus)
        };
        
        bus.emit("create_public_context", publicContext);
        
        return publicContext;
    }
    
    privateContext = {
        init: init,
        destroy: destroy,
        bus: bus,
        emit: bus.emit.bind(bus),
        on: bus.on.bind(bus),
        once: bus.once.bind(bus),
        removeListener: bus.removeListener.bind(bus),
        registerComponent: registerComponent,
        getComponent: getComponent,
        hasComponent: hasComponent,
        getResource: getResource,
        hasResource: hasResource,
        getPublicContext: createPublicContext
    };
    
    return privateContext;
}

module.exports = {
    create: create
};
