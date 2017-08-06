
var clone = require("clone");
var createApi = require("../utils/node.js");

function createKey(id) {
    return "__objdata_" + id;
}

function create(context) {
    
    var story, vars, env;
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        story = context.getComponent("story");
        
        env.set("last", function (tag) {
            
            var lastNodes = vars.get("_lastNodes") || {};
            
            return lastNodes[tag];
        });
        
        context.on("before_run_node", onBeforeRunNode);
    }
    
    function destroy() {
        
        context.removeListener("before_run_node", onBeforeRunNode);
        
        vars = null;
        story = null;
    }
    
    function onBeforeRunNode(node) {
        
        var lastNodes = vars.get("_lastNodes") || {};
        
        getData(node.id).tags.forEach(function (originalTag) {
            
            var allTags = resolveTagHierarchy(originalTag);
            
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
            
            tags.push(ancestor);
            
            resolveTagHierarchy(ancestor).forEach(function (otherTag) {
                tags.push(otherTag);
            });
        });
        
        return tags;
    }
    
    function get(id) {
        
        var data;
        
        if (!has(id)) {
            throw new Error("No such node id: " + id);
        }
        
        data = getData(id);
        
        return createApi(id, data, context.getComponent("nodes"));
    }
    
    function has(id) {
        return hasData(id) || story.hasNode(id);
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
        destroy: destroy,
        get: get,
        has: has
    };
}

module.exports = create;
