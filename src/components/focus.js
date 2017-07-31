
function create(context) {
    
    var mode, modes, focusOffset;
    
    function init() {
        modes = {};
    }
    
    function destroy() {
        modes = null;
    }
    
    function getElements() {
        return document.querySelectorAll("[data-focus-mode='" + mode + "']");
    }
    
    function setMode(newMode) {
        context.emit("before_change_focus_mode", mode);
        mode = newMode;
        context.emit("change_focus_mode", mode);
    }
    
    function getMode() {
        return mode;
    }
    
    function hasMode(name) {
        return (name in modes);
    }
    
    function previous() {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = 0;
        }
        
        focusOffset -= 1;
        
        if (focusOffset < 0) {
            focusOffset = count() - 1;
        }
        
        element = getElementInFocus();
        
        context.emit("focus_previous", element);
        context.emit("focus_change", element);
    }
    
    function next() {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = -1;
        }
        
        focusOffset += 1;
        
        if (focusOffset > count() - 1) {
            focusOffset = 0;
        }
        
        element = getElementInFocus();
        
        context.emit("focus_next", element);
        context.emit("focus_change", element);
    }
    
    function execute() {
        
        if (typeof focusOffset === "number") {
            getElementInFocus().click();
            reset();
        }
        else {
            document.activeElement.click();
        }
    }
    
    function getElementInFocus() {
        return getElements()[focusOffset];
    }
    
    function count() {
        return getElements().length;
    }
    
    function reset() {
        focusOffset = undefined;
    }
    
    return {
        init: init,
        destroy: destroy,
        getMode: getMode,
        setMode: setMode,
        hasMode: hasMode,
        getElements: getElements,
        getElementInFocus: getElementInFocus,
        execute: execute,
        next: next,
        previous: previous
    };
}

module.exports = create;
