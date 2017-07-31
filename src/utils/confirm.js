
function confirm(text, then) {
    
    var boxContainer = document.createElement("div");
    var oldFocus = focus.getMode();
    
    focus.setMode("messagebox");
    
    boxContainer.setAttribute("class", "MessageBoxContainer");
    
    boxContainer.innerHTML = messageBoxTemplate.replace("{message}", text);
    
    boxContainer.addEventListener("click", onClick);
    container.appendChild(boxContainer);
    
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

module.exports = confirm;
