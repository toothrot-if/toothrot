/* global TOOTHROT */

(function () {
    
    var toothrotResources = "{{$resources}}";
    
    // @ts-ignore
    TOOTHROT.decorate("getResource", function (fn) {
        return function (name) {
            
            var result = fn(name);
            
            if (result) {
                return result;
            }
            
            return name === "toothrotResources" ? toothrotResources : null;
        };
    });
}());
