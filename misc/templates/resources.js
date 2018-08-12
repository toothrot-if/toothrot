/* global TOOTHROT */

(function (ids, files) {
    
    // @ts-ignore
    TOOTHROT.decorate("getResource", function (fn) {
        return function (name) {
            
            var result = fn(name);
            
            if (result) {
                return result;
            }
            
            return ids[name] ? files[ids[name]] : null;
        };
    });
    
}('{{$resourceIds}}', '{{$resourceFiles}}'));

(function (mods) {
    
    // @ts-ignore
    TOOTHROT.decorate("getModule", function (fn) {
        return function (name) {
            
            var result = fn(name);
            
            return result ? result : mods[name];
        };
    });
    
}('{{$mods}}'));

(function (components) {
    
    Object.keys(components).forEach(function (key) {
        // @ts-ignore
        TOOTHROT.addComponent(components[key]);
    });
    
}('{{$components}}'));
