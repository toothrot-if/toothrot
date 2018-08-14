
function create(context) {
    
    var format, template, scriptTemplate;
    
    var api = context.createInterface("scriptExporter", {
        render: render,
        renderScript: renderScript,
        renderScripts: renderScripts,
        renderNodeScript: renderNodeScript,
        renderGlobalScript: renderGlobalScript,
        renderSectionScript: renderSectionScript,
        getScriptFileDescription: getScriptFileDescription
    });
    
    function init() {
        
        var getModule = context.channel("getModule");
        var getResource = context.channel("getResource");
        
        format = getModule("vrep").create("{{$", "}}");
        template = getResource("scriptsTemplate");
        scriptTemplate = getResource("scriptTemplate");
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        format = null;
        template = null;
        scriptTemplate = null;
        
        context.disconnectInterface(api);
    }
    
    function getScriptFileDescription(story) {
        return "Exported scripts for Toothrot Engine project `" + story.meta.title + "`.";
    }
    
    function render(story) {
        
        var functions = api.renderScripts(story);
        
        return format(template, {
            description: api.getScriptFileDescription(story),
            engineVersion: context.channel("getEngineVersion")(),
            buildTime: (new Date()).toUTCString(),
            functions: functions
        });
    }
    
    function renderScripts(story) {
        
        var functions = "";
        
        functions += Object.keys(story.head.scripts).map(function (slotName) {
            return api.renderGlobalScript(story, slotName);
        }).join("");
        
        functions += Object.keys(story.nodes).map(function (nodeName) {
            
            var node = story.nodes[nodeName];
            
            return Object.keys(node.scripts).map(function (slotName) {
                return api.renderNodeScript(story, node, slotName);
            });
        }).join("");
        
        functions += Object.keys(story.sections).map(function (sectionName) {
            
            var section = story.sections[sectionName];
            
            return Object.keys(section.scripts).map(function (slotName) {
                return api.renderSectionScript(story, section, slotName);
            });
        }).join("");
        
        return functions;
    }
    
    function renderNodeScript(story, node, slotName) {
        
        var script = node.scripts[slotName];
        
        return api.renderScript(
            "Script for slot `" + slotName +"` in node `" + node.id + "`.",
            "node_" + node.id,
            script
        );
    }
    
    function renderSectionScript(story, section, slotName) {
        
        var script = section.scripts[slotName];
        
        return api.renderScript(
            "Script for slot `" + slotName +"` in section `" + section.id + "`.",
            "section_" + section.id,
            script
        );
    }
    
    function renderGlobalScript(story, slotName) {
        
        var script = story.head.scripts[slotName];
        
        return api.renderScript("Script for global slot `" + slotName + "`.", "global", script);
    }
    
    function renderScript(description, prefix, script) {
        return format(scriptTemplate, {
            description: description,
            file: script.file,
            line: script.line,
            functionName: prefix + "__slot_" + script.slot,
            functionBody: script.body
        });
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
