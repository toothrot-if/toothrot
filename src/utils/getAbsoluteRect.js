
function getAbsoluteRect(element) {
    
    var rect = element.getBoundingClientRect();
    
    return {
        left: rect.left + getScrollX(),
        top: rect.top + getScrollY(),
        width: rect.width,
        height: rect.height
    };
}

module.exports = getAbsoluteRect;
