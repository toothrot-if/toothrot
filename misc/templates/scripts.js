//
// {{$description}}
//
// Engine version: {{$engineVersion}}
// Build time: {{$buildTime}}
//

/* global TOOTHROT */

(function () {
    
    var scripts = {};
    
    /* eslint-disable camelcase */
    /* eslint-disable no-unused-vars */
    
    {{$functions}}
    
    /* eslint-enable camelcase */
    /* eslint-enable no-unused-vars */
    
    // @ts-ignore
    TOOTHROT.decorate("getGlobalScript", function (fn) {
        return function (name) {
            
            var scriptName;
            var result = fn(name);
            
            if (result) {
                return result;
            }
            
            scriptName = "global__slot_" + name;
            
            return scriptName in scripts ? scripts[scriptName] : null;
        };
    });
    
    // @ts-ignore
    TOOTHROT.decorate("getSectionScript", function (fn) {
        return function (sectionName, slotName) {
            
            var scriptName;
            var result = fn(sectionName, slotName);
            
            if (result) {
                return result;
            }
            
            scriptName = "section_" + sectionName + "__slot_" + slotName;
            
            return scriptName in scripts ? scripts[scriptName] : null;
        };
    });
    
    // @ts-ignore
    TOOTHROT.decorate("getNodeScript", function (fn) {
        return function (nodeName, slotName) {
            
            var scriptName;
            var result = fn(nodeName, slotName);
            
            if (result) {
                return result;
            }
            
            scriptName = "node_" + nodeName + "__slot_" + slotName;
            
            return scriptName in scripts ? scripts[scriptName] : null;
        };
    });
    
}());
