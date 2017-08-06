//
// # Highlighter Component
//
// The highlighter is an absolutely positioned element that can be moved over
// clickable elements by using the arrow keys. Hitting the return key when an element
// is highlighted will execute a click on the element.
//

var compose = require("enjoy-core/compose");
var transform = require("transform-js").transform;

var setStyle = require("../../utils/browser/setStyle");
var scrolling = require("../../utils/browser/scrolling");
var getAbsoluteRect = require("../../utils/browser/getAbsoluteRect");

function create(context) {
    
    var highlighter, focus;
    
    function init() {
        
        focus = context.getComponent("focus");
        highlighter = document.createElement("div");
        
        highlighter.setAttribute("class", "Highlighter");
        highlighter.setAttribute("data-type", "highlighter");
        
        highlighter.addEventListener("click", onClick);
        
        document.body.appendChild(highlighter);
        
        context.on("timer_end", reset);
        context.on("screen_exit", reset);
        context.on("screen_entry", reset);
        context.on("change_focus_mode", reset);
        context.on("focus_change", highlight);
        context.on("element_reflow", highlightCurrent);
    }
    
    function destroy() {
        
        highlighter.removeEventListener("click", onClick);
        highlighter.parentNode.removeChild(highlighter);
        
        context.removeListener("timer_end", reset);
        context.removeListener("screen_exit", reset);
        context.removeListener("screen_entry", reset);
        context.removeListener("change_focus_mode", reset);
        context.removeListener("focus_change", highlight);
        context.removeListener("element_reflow", highlightCurrent);
        
        highlighter = null;
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
            highlight(element);
        }
    }
    
    function highlight(element) {
        
        var padding = 1;
        var sourceRect = getAbsoluteRect(highlighter);
        var targetRect = getAbsoluteRect(element);
        var setHighlighterStyle = setStyle(highlighter);
        
        var left = targetRect.left - padding;
        var top = targetRect.top - padding;
        var width = targetRect.width + (2 * padding);
        var height = targetRect.height + (2 * padding);
        var currentOpacity = +highlighter.style.opacity || 0;
        
        var setX = setHighlighterStyle("left", "px", sourceRect.left, left);
        var setY = setHighlighterStyle("top", "px", sourceRect.top, top);
        var setWidth = setHighlighterStyle("width", "px", sourceRect.width, width);
        var setHeight = setHighlighterStyle("height", "px", sourceRect.height, height);
        var setOpacity = setHighlighterStyle("opacity", "", currentOpacity, 1);
        
        var setValues = compose(setX, setY, setWidth, setHeight, setOpacity);
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
        
        setTimeout(function () {
            scrolling.scrollToElement(element);
        }, 10);
    }

    function reset() {
        
        var setHighlighterStyle = setStyle(highlighter);
        var sourceRect = getAbsoluteRect(highlighter);
        
        var setValues = compose(
            setHighlighterStyle("left", "px", sourceRect.left, 0),
            setHighlighterStyle("top", "px", sourceRect.top, 0),
            setHighlighterStyle("width", "px", sourceRect.width, 0),
            setHighlighterStyle("height", "px", sourceRect.height, 0),
            setHighlighterStyle("opacity", "", (+highlighter.style.opacity || 0), 0)
        );
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
    }
    
    return {
        init: init,
        destroy: destroy,
        reset: reset
    };
}

module.exports = create;
