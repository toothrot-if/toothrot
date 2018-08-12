//
// # Highlighter Component
//
// The highlighter is an absolutely positioned element that can be moved over
// clickable elements by using the arrow keys. Hitting the return key when an element
// is highlighted will execute a click on the element.
//

function createStyleSetter(element) {
    return function (key, unit, start, end) {
        return function (value) {
            element.style[key] = (start + (value * (end - start))) + unit;
            return value;
        };
    };
}

function create(context) {
    
    var highlighterElement, focus, scrolling, getAbsoluteRect, transform;
    
    var highlighter = context.createInterface("highlighter", {
        highlight: highlight,
        highlightCurrent: highlightCurrent,
        reset: reset,
        onClick: onClick
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        transform = getModule("transform-js").transform;
        getAbsoluteRect = context.channel("uiPositioning/getAbsoluteRect");
        
        context.connectInterface(highlighter);
        
        scrolling = context.getInterface("uiScrolling", ["scrollToElement"]);
        focus = context.getInterface("focus", ["execute", "getElementInFocus"]);
        highlighterElement = document.createElement("div");
        
        highlighterElement.setAttribute("class", "highlighter");
        highlighterElement.setAttribute("data-type", "highlighter");
        
        highlighterElement.addEventListener("click", onClick);
        
        document.body.appendChild(highlighterElement);
        
        context.on("timer_end", highlighter.reset);
        context.on("screen_exit", highlighter.reset);
        context.on("screen_entry", highlighter.reset);
        context.on("change_focus_mode", highlighter.reset);
        context.on("focus_change", highlighter.highlight);
        context.on("element_reflow", highlighter.highlightCurrent);
    }
    
    function destroy() {
        
        context.disconnectInterface(highlighter);
        
        highlighterElement.removeEventListener("click", highlighter.onClick);
        highlighterElement.parentNode.removeChild(highlighterElement);
        
        context.removeListener("timer_end", highlighter.reset);
        context.removeListener("screen_exit", highlighter.reset);
        context.removeListener("screen_entry", highlighter.reset);
        context.removeListener("change_focus_mode", highlighter.reset);
        context.removeListener("focus_change", highlighter.highlight);
        context.removeListener("element_reflow", highlighter.highlightCurrent);
        
        highlighterElement = null;
        focus = null;
    }
    
    function onClick(event) {
        event.stopPropagation();
        event.preventDefault();
        focus.execute();
    }
    
    function highlightCurrent() {
        
        var element = focus.getElementInFocus();
        
        if (element) {
            highlighter.highlight(element);
        }
    }
    
    function highlight(element) {
        
        var padding = 1;
        var sourceRect = getAbsoluteRect(highlighterElement);
        var targetRect = getAbsoluteRect(element);
        var setHighlighterStyle = createStyleSetter(highlighterElement);
        
        var left = targetRect.left - padding;
        var top = targetRect.top - padding;
        var width = targetRect.width + (2 * padding);
        var height = targetRect.height + (2 * padding);
        var currentOpacity = +highlighterElement.style.opacity || 0;
        
        var setX = setHighlighterStyle("left", "px", sourceRect.left, left);
        var setY = setHighlighterStyle("top", "px", sourceRect.top, top);
        var setWidth = setHighlighterStyle("width", "px", sourceRect.width, width);
        var setHeight = setHighlighterStyle("height", "px", sourceRect.height, height);
        var setOpacity = setHighlighterStyle("opacity", "", currentOpacity, 1);
        
        function setValues(value) {
            return setOpacity(setHeight(setWidth(setY(setX(value)))));
        }
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
        
        setTimeout(function () {
            scrolling.scrollToElement(element);
        }, 10);
    }

    function reset() {
        
        var setHighlighterStyle = createStyleSetter(highlighterElement);
        var sourceRect = getAbsoluteRect(highlighterElement);
        
        var setX = setHighlighterStyle("left", "px", sourceRect.left, 0);
        var setY = setHighlighterStyle("top", "px", sourceRect.top, 0);
        var setWidth = setHighlighterStyle("width", "px", sourceRect.width, 0);
        var setHeight = setHighlighterStyle("height", "px", sourceRect.height, 0);
        
        var setOpacity = setHighlighterStyle(
            "opacity",
            "",
            (+highlighterElement.style.opacity || 0),
            0
        );
        
        function setValues(value) {
            return setOpacity(setHeight(setWidth(setY(setX(value)))));
        }
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
