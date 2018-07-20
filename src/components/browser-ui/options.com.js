//
// # Options Browser UI Component
//
// This component adds the *options* feature to the browser UI (`ui` component).
//

var CHANNEL_UI_INSERT_CONTROLS = "ui/insertNodeControls";
var CHANNEL_UI_HAS_CONTROLS = "ui/nodeHasControls";

function create(context) {
    
    var container, wrapper;
    
    var api = context.createInterface("uiOptions", {
        add: addOption,
        addMany: addOptions,
        createWrapper: createWrapper,
        createContainer: createContainer
    });
    
    function init() {
        
        context.connectInterface(api);
        
        // Options are put into a wrapper element
        // so that clicks can be intercepted and to allow
        // more flexibility in styling the elements with CSS.
        wrapper = api.createWrapper();
        container = api.createContainer();
        
        wrapper.appendChild(container);
        
        context.decorate(CHANNEL_UI_INSERT_CONTROLS, decorateNodeControls);
        context.decorate(CHANNEL_UI_HAS_CONTROLS, decorateHasNodeControls);
    }
    
    function destroy() {
        
        context.disconnectInterface(api);
        context.removeDecorator(CHANNEL_UI_INSERT_CONTROLS, decorateNodeControls);
        context.removeDecorator(CHANNEL_UI_HAS_CONTROLS, decorateHasNodeControls);
        
        api = null;
        wrapper = null;
        container = null;
    }
    
    function decorateNodeControls(fn) {
        return function (nodeElement, node) {
            
            var result = fn.apply(null, arguments);
            
            if (node.options.length) {
                api.addMany(nodeElement, node);
            }
            
            return result;
        };
    }
    
    function decorateHasNodeControls(fn) {
        return function (node) {
            return node.options && node.options.length ? true : fn.apply(null, arguments);
        };
    }
    
    function createWrapper() {
        
        var wrapper = document.createElement("div");
        
        wrapper.setAttribute("class", "options-curtain");
        wrapper.addEventListener("click", onWrapperClick);
        
        return wrapper;
    }
    
    function createContainer() {
        
        var container = document.createElement("div");
        
        container.setAttribute("class", "options-container");
        
        return container;
    }
    
    function addOptions(nodeElement, node) {
        
        container.innerHTML = "";
        
        node.options.forEach(function (option) {
            api.add(option, node);
        });
        
        nodeElement.appendChild(wrapper);
    }
    
    function addOption(opt) {
        
        var option = document.createElement("span");
        
        option.setAttribute("class", "option");
        option.setAttribute("data-type", "option");
        option.setAttribute("data-target", opt.target);
        option.setAttribute("data-focus-mode", "node");
        option.setAttribute("tabindex", "1");
        option.setAttribute("data-value", window.btoa(JSON.stringify(opt.value)));
        
        option.innerHTML = opt.label;
        
        container.appendChild(option);
    }
    
    function onWrapperClick(event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
