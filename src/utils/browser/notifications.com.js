/* global setTimeout */

function create(context) {
    
    var format, transform;
    
    var api = context.createInterface("uiNotifications", {
        create: createNotification
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        format = getModule("vrep").format;
        transform = getModule("transform-js").transform;
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function createNotification(template, fadeDuration) {
        
        var duration = fadeDuration || 200;
        
        return function (message, type, timeout) {
            
            var container = document.createElement("div");
            var hidden = false;
            var shown = false;
            
            container.setAttribute("class", "notification-container");
            
            type = type || "default";
            
            container.style.opacity = "0";
            container.innerHTML = format(template, {message: message, type: type});
            
            document.body.appendChild(container);
            
            show();
            
            setTimeout(hide, timeout || 2000);
            
            function show() {
                
                if (shown) {
                    return;
                }
                
                transform(
                    0,
                    1,
                    function (v) {
                        container.style.opacity = "" + v;
                    },
                    {duration: duration},
                    function () {
                        shown = true;
                    }
                );
            }
            
            function hide() {
                
                if (hidden) {
                    return;
                }
                
                transform(
                    1,
                    0,
                    function (v) {
                        container.style.opacity = "" + v;
                    },
                    {duration: duration},
                    function () {
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
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
