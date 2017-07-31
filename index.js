/* global require */

var clone = require("clone");
var parser = require("./src/parser");
var validator = require("./src/validator");

//
// The `onError` parameter can be used to obtain errors as
// they appear. If it's not supplied, errors are collected
// and returned instead. If it *is* used, `unedfined` is
// returned.
//
function validate(ast, onError) {
    
    var errors = [];
    
    validator(onError || collect).validate(ast);
    
    function collect(error) {
        errors.push(error);
    }
    
    if (onError) {
        return;
    }
    
    return errors;
}

function parseNodeContent(originalNode, then) {
    
    var errors = [];
    var node = clone(originalNode);
    
    node.links = node.links || [];
    node.scripts = node.scripts || [];
    
    parser.parseNodeContent(collect, node);
    
    function collect(error) {
        errors.push(error);
    }
    
    then(errors.length ? errors : null, errors.length ? null : node);
}

module.exports = {
    build: require("./src/builder").build,
    init: require("./src/initializer").init,
    pack: require("./src/packer").pack,
    parse: parser.parse,
    parseNodeContent: parseNodeContent,
    validate: validate
};
