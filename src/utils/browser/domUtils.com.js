
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

function create(context) {
    
    var api = context.createInterface("domUtils", {
        getClickableParent: getClickableParent
    });
    
    function init() {
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
