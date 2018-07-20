
function create(context) {
    
    var mode, modes, focusOffset;
    
    var api = context.createInterface("focus", {
        getMode: getMode,
        setMode: setMode,
        hasMode: hasMode,
        getElements: getElements,
        getElementInFocus: getElementInFocus,
        execute: execute,
        next: next,
        previous: previous,
        reset: reset,
        count: count
    });
    
    function init() {
        
        modes = {};
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        context.disconnectInterface(api);
        
        modes = null;
    }
    
    function getElements() {
        return document.querySelectorAll("[data-focus-mode='" + mode + "']");
    }
    
    function setMode(newMode) {
        context.publish("before_change_focus_mode", mode);
        mode = newMode;
        context.publish("change_focus_mode", mode);
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
            focusOffset = api.count() - 1;
        }
        
        element = api.getElementInFocus();
        
        context.publish("focus_previous", element);
        context.publish("focus_change", element);
    }
    
    function next() {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = -1;
        }
        
        focusOffset += 1;
        
        if (focusOffset > api.count() - 1) {
            focusOffset = 0;
        }
        
        element = api.getElementInFocus();
        
        context.publish("focus_next", element);
        context.publish("focus_change", element);
    }
    
    function execute() {
        
        if (typeof focusOffset === "number") {
            api.getElementInFocus().click();
            api.reset();
        }
        else {
            // @ts-ignore
            document.activeElement.click();
        }
    }
    
    function getElementInFocus() {
        return api.getElements()[focusOffset];
    }
    
    function count() {
        return api.getElements().length;
    }
    
    function reset() {
        focusOffset = undefined;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
