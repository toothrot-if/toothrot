
function create(context) {
    
    var api = context.createInterface("uiConfirmations", {
        create: createConfirm
    });
    
    function init() {
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function createConfirm() {
        
        function confirm(text, then) {
            
            var template = context.channel("resources/get").call("templates").confirm;
            var focus = context.getInterface("focus", ["getMode", "setMode"]);
            var boxContainer = document.createElement("div");
            var oldFocus = focus.getMode();
            
            focus.setMode("messagebox");
            
            boxContainer.setAttribute("class", "message-box-container");
            
            boxContainer.innerHTML = template.replace("{message}", text);
            
            boxContainer.addEventListener("click", onClick);
            document.body.appendChild(boxContainer);
            
            boxContainer.focus();
            
            function onClick(event) {
                
                var type = event.target.getAttribute("data-type");
                var value = event.target.getAttribute("data-value");
                
                if (type === "messagebox-button") {
                    
                    event.stopPropagation();
                    event.preventDefault();
                    
                    focus.setMode(oldFocus);
                    boxContainer.parentNode.removeChild(boxContainer);
                    boxContainer.removeEventListener("click", onClick);
                    
                    then(value === "yes" ? true : false);
                }
            }
        }
        
        return confirm;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
