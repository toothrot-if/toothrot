/* eslint-disable no-eval */

function create(context) {
    
    var api = context.createInterface("scripts", {
        run: runScript
    });
    
    function init() {
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function runScript(engine, __story, _, $, __body, __line, __file) {
        
        var link = _.link; // eslint-disable-line no-unused-vars
        var nodes = __story.nodes; // eslint-disable-line no-unused-vars
        var title = __story.meta.title; // eslint-disable-line no-unused-vars
        
        // @ts-ignore
        window.__line = __line;
        // @ts-ignore
        window.__file = __file;
        
        return eval(__body);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
