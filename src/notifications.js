/* global require, module, setTimeout */

var format = require("vrep").format;
var transform = require("transform-js").transform;

function create (template, fadeDuration) {
    
    var duration = fadeDuration || 200;
    
    return function (message, type, timeout) {
        
        var container = document.createElement("div");
        var hidden = false;
        var shown = false;
        var currentTransform;
        
        container.setAttribute("class", "NotificationContainer");
        
        type = type || "default";
        
        container.style.opacity = "0";
        container.innerHTML = format(template, {message: message, type: type});
        
        document.body.appendChild(container);
        
        show();
        
        setTimeout(hide, timeout || 2000);
        
        function show () {
            
            if (shown) {
                return;
            }
            
            currentTransform = transform(
                0,
                1,
                function (v) {
                    container.style.opacity = "" + v;
                },
                {duration: duration},
                function () {
                    shown = true;
                    currentTransform = undefined;
                }
           );
        }
        
        function hide () {
            
            if (hidden) {
                return;
            }
            
            currentTransform = transform(
                1,
                0,
                function (v) {
                    container.style.opacity = "" + v;
                },
                {duration: duration},
                function () {
                    currentTransform = undefined;
                    hidden = true;
                    container.parentNode.removeChild(container);
                }
            );
        }
        
        return {
            hide: hide
        };
    };
}

module.exports = {
    create: create
};
