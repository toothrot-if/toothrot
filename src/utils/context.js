
var EventEmitter = require("events");

//
// # Context
//
// The context is an object that is given to components which they can use to interact
// with the rest of the engine.
//
function create(options) {
    
    var privateContext;
    
    var data = {};
    var bus = new EventEmitter();
    var components = Object.create(null);
    var componentFactories = Object.create(null);
    
    options = options || {};
    options.components = options.components || {};
    
    Object.keys(options.components).forEach(function (key) {
        componentFactories[key] = options.components[key];
    });
    
    function getData() {
        return data;
    }
    
    function setData(newData) {
        bus.emit("before_set_data", data);
        data = newData;
        bus.emit("set_data", data);
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
            components[name] = componentFactories[name]();
            
            if (components[name].init) {
                components[name].init();
            }
        }
        
        return components[name];
    }
    
    function createPublicContext() {
        
        var publicContext = {
            getData: getData,
            setData: setData,
            getComponent: getComponent,
            emit: bus.emit.bind(bus),
            once: bus.once.bind(bus),
            on: bus.on.bind(bus),
            removeListener: bus.removeListener.bind(bus)
        };
        
        bus.emit("create_public_context", publicContext);
        
        return publicContext;
    }
    
    privateContext = {
        getData: getData,
        setData: setData,
        bus: bus,
        emit: bus.emit.bind(bus),
        on: bus.on.bind(bus),
        once: bus.once.bind(bus),
        registerComponent: registerComponent,
        getPublicContext: createPublicContext
    };
    
    return privateContext;
}

module.exports = {
    create: create
};
