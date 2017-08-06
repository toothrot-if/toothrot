
var transform = require("transform-js").transform;

function create(element, speed, then) {
    
    var chars, left;
    var offset = 1000 / (speed || 40);
    var stop = false;
    var timeouts = [];
    
    markCharacters(element);
    hideCharacters(element);
    
    chars = element.querySelectorAll(".Char");
    left = chars.length;
    
    then = then || function () {};
    
    function start() {
        
        [].forEach.call(chars, function (char, i) {
            
            var id = setTimeout(function () {
                
                if (stop) {
                    return;
                }
                
                transform(0, 1, setOpacity(char), {duration: 10 * offset}, function () {
                    
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
    
    var chars = element.querySelectorAll(".Char");
    
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
                text += '<span class="Char" data-char="' + offset + '">' + char + '</span>';
                offset += 1;
            });
            
            newNode = document.createElement("span");
            
            newNode.setAttribute("class", "CharContainer");
            
            newNode.innerHTML = text;
            
            child.parentNode.replaceChild(newNode, child);
        }
        else if (child.nodeType === ELEMENT) {
            offset = markCharacters(child, offset);
        }
    });
    
    return offset;
}

function setOpacity(element) {
    return function (v) {
        element.style.opacity = v;
    };
}

module.exports = create;
