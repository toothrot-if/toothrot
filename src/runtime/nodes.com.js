
function contains(array, thing) {
    return (array.indexOf(thing) >= 0);
}

function createApi(id, data, nodes) {
    
    var api = {
        
        id: id,
        
        isA: isA,
        isntA: isntA,
        is: is,
        isnt: isnt,
        isIn: isIn,
        isntIn: isntIn,
        isSneaky: isSneaky,
        isntSneaky: isntSneaky,
        isEmpty: isEmpty,
        isntEmpty: isntEmpty,
        be: be,
        beSneaky: beSneaky,
        dontBe: dontBe,
        dontBeSneaky: dontBeSneaky,
        moveTo: moveTo,
        insert: insert,
        contains: containsNode,
        children: children,
        doesntContain: doesntContain,
        get: get,
        set: set,
        has: has,
        prop: prop,
        raw: raw
    };
    
    function get(key) {
        return data[key];
    }
    
    function has(key) {
        return (key in data);
    }
    
    function set(key, value) {
        data[key] = value;
        return api;
    }
    
    function isA(tag) {
        return contains(data.tags, tag);
    }
    
    function isntA(tag) {
        return !isA(tag);
    }
    
    function is(flag) {
        return contains(data.flags, flag);
    }
    
    function isnt(flag) {
        return !is(flag);
    }
    
    function isEmpty() {
        return data.contains.length < 1;
    }
    
    function isntEmpty() {
        return !isEmpty();
    }
    
    function containsNode(id) {
        return contains(data.contains, id);
    }
    
    function doesntContain(id) {
        return !containsNode(id);
    }
    
    function isIn(id) {
        
        if (!nodes.has(id)) {
            return false;
        }
        
        return nodes.get(id).contains(api.id);
    }
    
    function isntIn(id) {
        return !isIn(id);
    }
    
    function isSneaky() {
        return is("sneaky");
    }
    
    function isntSneaky() {
        return !isSneaky();
    }
    
    function be(flag) {
        
        if (!is(flag)) {
            data.flags.push(flag);
        }
        
        return api;
    }
    
    function beSneaky() {
        return be("sneaky");
    }
    
    function dontBe(flag) {
        
        if (is(flag)) {
            data.flags = data.flags.filter(function (nodeFlag) {
                return nodeFlag !== flag;
            });
        }
        
        return api;
    }
    
    function dontBeSneaky() {
        return dontBe("sneaky");
    }
    
    function moveTo(otherId) {
        
        var otherNode;
        
        if (!nodes.has(otherId)) {
            throw new Error(
                "Cannot move node '" + id + "' to node '" + otherId + "': " +
                "No such node ID!"
            );
        }
        
        otherNode = nodes.get(otherId);
        
        data.wasIn.forEach(function (itemId) {
            
            var item = nodes.get(itemId);
            
            item.set("contains", item.get("contains").filter(function (child) {
                return child !== id;
            }));
            
        });
        
        otherNode.insert(id);
        
        return api;
    }
    
    function insert(otherId) {
        
        var otherNode;
        
        if (!nodes.has(otherId)) {
            console.warn("No such node ID: " + otherId);
            return api;
        }
        
        if (!contains(otherId)) {
            
            data.contains.push(otherId);
            
            otherNode = nodes.get(otherId);
            
            if (otherNode.get("wasIn").indexOf(id) < 0) {
                otherNode.get("wasIn").push(id);
            }
        }
        
        return api;
    }
    
    function children() {
        return data.contains.slice();
    }
    
    function prop(name, value) {
        
        if (arguments.length > 1) {
            data[name] = value;
        }
        
        return data[name];
    }
    
    function raw() {
        return data;
    }
    
    return api;
}

function createKey(id) {
    return "__objdata_" + id;
}

function create(context) {
    
    var story, vars, env, clone;
    
    var api = context.createInterface("nodes", {
        get: get,
        has: has,
        hasData: hasData,
        getData: getData,
        resolveTagHierarchy: resolveTagHierarchy
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        clone = getModule("clone");
        
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
