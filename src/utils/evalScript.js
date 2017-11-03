/* eslint-disable no-unused-vars, no-eval */

function evalScript(engine, __story, _, $, __body, __line) {
    
    var link = _.link;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    
    return eval(__body);
}

module.exports = evalScript;
