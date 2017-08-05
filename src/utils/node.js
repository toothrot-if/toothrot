
function create(node, story, vars) {
    
    var api = {
        
        id: node.id,
        
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
        contains: containsNode,
        doesntContain: doesntContain,
        raw: raw,
        prop: prop
    };
    
    function isA(tag) {
        return contains(node.tags, tag);
    }
    
    function isntA(tag) {
        return !isA(tag);
    }
    
    function is(flag) {
        return contains(node.flags, flag);
    }
    
    function isnt(flag) {
        return !is(flag);
    }
    
    function isEmpty() {
        return node.contains.length < 1;
    }
    
    function isntEmpty() {
        return !isEmpty();
    }
    
    function containsNode(id) {
        return contains(node.contains, id);
    }
    
    function doesntContain(id) {
        return !containsNode(id);
    }
    
    function isIn(id) {
        
        if (!story.hasNode(id)) {
            return false;
        }
        
        return contains(story.getNode(id).contains, id);
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
            node.flags.push(flag);
        }
        
        return api;
    }
    
    function beSneaky() {
        return be("sneaky");
    }
    
    function dontBe(flag) {
        
        if (is(flag)) {
            node.flags = node.flags.filter(function (nodeFlag) {
                return nodeFlag !== flag;
            });
        }
        
        return api;
    }
    
    function dontBeSneaky() {
        return dontBe("sneaky");
    }
    
    function moveTo(id) {
        
        if (!story.hasNode(id)) {
            throw new Error(
                "Cannot move node '" + node.id + "' to node '" + id + "': " +
                "No such node ID!"
            );
        }
        
        node.wasIn.forEach(function (itemId) {
            
            var item = story.getNode(itemId);
            
            item.contains = item.contains.filter(function (child) {
                return child !== node.id;
            });
            
        });
        
        story.getNode(id).contains.push(node.id);
        
        return api;
    }
    
    function raw() {
        return node;
    }
    
    function prop(name, value) {
        
        if (arguments.length > 1) {
            node[name] = value;
        }
        
        return value;
    }
    
    return api;
}

function contains(array, thing) {
    return (array.indexOf(thing) >= 0);
}

module.exports = create;
