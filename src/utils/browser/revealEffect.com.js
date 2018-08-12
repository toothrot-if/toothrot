
function create(context) {
    
    var transform;
    
    var api = context.createInterface("uiRevealEffect", {
        create: createEffect,
        markCharacters: markCharacters,
        hideCharacters: hideCharacters,
        setOpacity: setOpacity
    });
    
    function init() {
        transform = context.channel("getModule").call("transform-js").transform;
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function createEffect(element, speed, then) {
        
        var chars, left;
        var offset = 1000 / (speed || 40);
        var stop = false;
        var timeouts = [];
        
        api.markCharacters(element);
        api.hideCharacters(element);
        
        chars = element.querySelectorAll(".char");
        left = chars.length;
        
        then = then || function () {};
        
        function start() {
            
            [].forEach.call(chars, function (char, i) {
                
                var id = setTimeout(function () {
                    
                    if (stop) {
                        return;
                    }
                    
                    transform(0, 1, api.setOpacity(char), {duration: 10 * offset}, function () {
                        
                        left -= 1;
                        
                        if (stop) {
                            return;
                        }
                        
                        if (left <= 0) {
                            then();
                        }
                        
                    });
                    
                }, i * offset);
                
                timeouts.push(id);
            });
        }
        
        function cancel() {
            
            if (stop || left <= 0) {
                return false;
            }
            
            stop = true;
            
            timeouts.forEach(function (id) {
                clearTimeout(id);
            });
            
            [].forEach.call(chars, function (char) {
                char.style.opacity = "1";
            });
            
            then();
            
            return true;
        }
        
        return {
            start: start,
            cancel: cancel
        };
    }
    
    function hideCharacters(element) {
        
        var chars = element.querySelectorAll(".char");
        
        [].forEach.call(chars, function (char) {
            char.style.opacity = 0;
        });
    }
    
    function markCharacters(element, offset) {
        
        var TEXT_NODE = 3;
        var ELEMENT = 1;
        
        offset = offset || 0;
        
        [].forEach.call(element.childNodes, function (child) {
            
            var text = "", newNode;
            
            if (child.nodeType === TEXT_NODE) {
                
                [].forEach.call(child.textContent, function (char) {
                    text += '<span class="char" data-char="' + offset + '">' + char + '</span>';
                    offset += 1;
                });
                
                newNode = document.createElement("span");
                
                newNode.setAttribute("class", "char-container");
                
                newNode.innerHTML = text;
                
                child.parentNode.replaceChild(newNode, child);
            }
            else if (child.nodeType === ELEMENT) {
                offset = api.markCharacters(child, offset);
            }
        });
        
        return offset;
    }
    
    function setOpacity(element) {
        return function (v) {
            element.style.opacity = v;
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
