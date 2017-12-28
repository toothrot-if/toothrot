/* eslint-disable no-unused-vars, no-eval */

function evalScript(engine, __story, _, $, __body, __line, __file) {
    
    var link = _.link;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    window.__file = __file;
    
    return eval(__body);
}

module.exports = evalScript;
