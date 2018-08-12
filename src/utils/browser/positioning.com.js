
function create(context) {
    
    var api = context.createInterface("uiPositioning", {
        getScrollX: getScrollX,
        getScrollY: getScrollY,
        getAbsoluteRect: getAbsoluteRect
    });
    
    function init() {
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function getScrollX() {
        // @ts-ignore
        return (window.pageXOffset || document.scrollLeft || 0) - (document.clientLeft || 0);
    }

    function getScrollY() {
        // @ts-ignore
        return (window.pageYOffset || document.scrollTop || 0) - (document.clientTop || 0);
    }
    
    function getAbsoluteRect(element) {
        
        var rect = element.getBoundingClientRect();
        
        return {
            left: rect.left + api.getScrollX(),
            top: rect.top + api.getScrollY(),
            width: rect.width,
            height: rect.height
        };
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
