
function create(id, data, nodes) {
    
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

function contains(array, thing) {
    return (array.indexOf(thing) >= 0);
}

module.exports = create;
