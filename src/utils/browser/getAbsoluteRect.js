
var scrollPosition = require("./scrollPosition");

function getAbsoluteRect(element) {
    
    var rect = element.getBoundingClientRect();
    
    return {
        left: rect.left + scrollPosition.getX(),
        top: rect.top + scrollPosition.getY(),
        width: rect.width,
        height: rect.height
    };
}

module.exports = getAbsoluteRect;
