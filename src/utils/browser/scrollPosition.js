
function getScrollX() {
    return (window.pageXOffset || document.scrollLeft || 0) - (document.clientLeft || 0);
}

function getScrollY() {
    return (window.pageYOffset || document.scrollTop || 0) - (document.clientTop || 0);
}

module.exports = {
    getX: getScrollX,
    getY: getScrollY
};
