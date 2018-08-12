
var isLikeGecko = (/like Gecko/i).test(window.navigator.userAgent);
var isGecko = !isLikeGecko && (/Gecko/i).test(window.navigator.userAgent);

function create(context) {
    
    var transform, getScrollbarWidth, positioning;
    
    var api = context.createInterface("uiScrolling", {
        hideScrollbar: hideScrollbar,
        scrollToBottom: scrollToBottom,
        scrollToElement: scrollToElement,
        isElementInView: isElementInView
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        positioning = context.getInterface("uiPositioning", [
            "getAbsoluteRect",
            "getScrollX",
            "getScrollY"
        ]);
        
        transform = getModule("transform-js").transform;
        getScrollbarWidth = getModule("scrollbarwidth");
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function hideScrollbar(element) {
        
        var scrollbarWidth = getScrollbarWidth();
        
        element.style.overflowY = "scroll";
        element.style.overflowX = "hidden";
        element.style.transform = "translate(" + scrollbarWidth + "px, 0px)";
    }
    
    function scrollToBottom(element, instantly) {
        
        if (instantly) {
            element.scroll(0, element.scrollHeight);
        }
        else {
            //
            // Firefox stops smooth scrolling altogether when calling this function repeatedly.
            // It has something to do with the 'behavior: "smooth"' part, so we use custom scrolling
            // when the browser uses Gecko as rendering engine.
            //
            if (isGecko) {
                transform(element.scrollTop, element.scrollHeight, function (v) {
                    element.scrollTop = v;
                }, {duration: 200, easing: "sineInOut", fps: 60});
            }
            else {
                element.scroll({
                    top: element.scrollHeight,
                    left: 0,
                    behavior: "smooth"
                });
            }
        }
    }
    
    function scrollToElement(element) {
        
        if (isElementInView(element)) {
            return;
        }
        
        try {
            element.scrollIntoView({
                behavior: "smooth"
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    
    function isElementInView(element) {
        
        var rect = positioning.getAbsoluteRect(element);
        var scrollX = positioning.getScrollX();
        var scrollY = positioning.getScrollY();
        var xInView = (scrollX <= rect.left) && (rect.left <= (scrollX + window.innerWidth));
        var yInView = (scrollY <= rect.top) && (rect.top <= (scrollY + window.innerHeight));
        
        return (xInView && yInView);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
