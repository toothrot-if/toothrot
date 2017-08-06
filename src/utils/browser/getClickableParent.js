
function getClickableParent(node) {
    
    var ELEMENT = 1;
    var first = node;
    
    while (node.parentNode) {
        
        node = node.parentNode;
        
        if (node.nodeType === ELEMENT && node.getAttribute("data-type")) {
            return node;
        }
    }
    
    return first;
}

module.exports = getClickableParent;
