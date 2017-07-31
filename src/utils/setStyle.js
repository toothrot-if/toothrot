
var auto = require("enjoy-core/auto");

var setStyle = auto(function (element, key, unit, start, end, value) {
    element.style[key] = (start + (value * (end - start))) + unit;
    return value;
});

module.exports = setStyle;
