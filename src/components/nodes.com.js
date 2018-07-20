
var clone = require("clone");
var createApi = require("../utils/node.js");

function createKey(id) {
    return "__objdata_" + id;
}

function create(context) {
    
    var story, vars, env;
    
    var api = context.createInterface("nodes", {
        get: get,
        has: has,
        hasData: hasData,
        getData: getData,
        resolveTagHierarchy: resolveTagHierarchy
    });
    
    function init() {
        
        context.connectInterface(api);
        
        env = context.getInterface("env", ["set"]);
        vars = context.getInterface("vars", ["get", "set"]);
        story = context.getInterface("story", ["getHierarchy", "getNode", "hasNode"]);
        
        env.set("last", function (tag) {
            
            var lastNodes = vars.get("_lastNodes") || {};
            
            return lastNodes[tag];
        });
        
        context.on("before_run_node", onBeforeRunNode);
    }
    
    function destroy() {
        
        context.removeListener("before_run_node", onBeforeRunNode);
        context.disconnectInterface(api);
        
        vars = null;
        story = null;
    }
    
    function onBeforeRunNode(node) {
        
        var lastNodes = vars.get("_lastNodes") || {};
        
        api.getData(node.id).tags.forEach(function (originalTag) {
            
            var allTags = api.resolveTagHierarchy(originalTag);
            
            allTags.push(originalTag);
            
            allTags.forEach(function (tag) {
                lastNodes[tag] = node.id;
            });
        });
        
        vars.set("_lastNodes", lastNodes);
    }
    
    function resolveTagHierarchy(tag) {
        
        var tags = [];
        var hierarchy = story.getHierarchy();
        var ancestors = hierarchy[tag] || [];
        
        ancestors.forEach(function (ancestor) {
            
            if (tags.indexOf(ancestor) >= 0) {
                return;
            }
            
            tags.push(ancestor);
            
            resolveTagHierarchy(ancestor).forEach(function (otherTag) {
                tags.push(otherTag);
            });
        });
        
        return tags;
    }
    
    function get(id) {
        
        var data;
        
        if (!api.has(id)) {
            throw new Error("No such node id: " + id);
        }
        
        data = api.getData(id);
        
        return createApi(id, data, context.getInterface("nodes", ["get", "has"]));
    }
    
    function has(id) {
        return api.hasData(id) || story.hasNode(id);
    }
    
    function hasData(id) {
        return !!vars.get(createKey(id));
    }
    
    function getData(id) {
        
        var key = createKey(id);
        var data = vars.get(key);
        
        if (!data) {
            data = clone(story.getNode(id).data);
            vars.set(key, data);
        }
        
        return data;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "nodes",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["any"],
    create: create
};
