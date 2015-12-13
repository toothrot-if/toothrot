/* global require */

var interpreter = require("./interpreter.js");
var resources, pack, element;

element = document.querySelector("script[type=toothrot-pack]");

if (element) {
    
    pack = element.innerHTML;
    resources = JSON.parse(window.btoa(pack));
    
    interpreter.run(resources);
}
else {
    window.TOOTHROT = interpreter;
}
