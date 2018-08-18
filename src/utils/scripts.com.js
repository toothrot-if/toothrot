
function create(context) {
    
    var story, env, vars, logger, getNodeScript, getGlobalScript, getSectionScript;
    
    var api = context.createInterface("scripts", {
        run: runScript,
        write: write,
        writeLn: writeLn,
        runNodeScript: runNodeScript,
        runGlobalScript: runGlobalScript,
        runSectionScript: runSectionScript
    });
    
    function init() {
        
        getNodeScript = context.channel("getNodeScript");
        getGlobalScript = context.channel("getGlobalScript");
        getSectionScript = context.channel("getSectionScript");
        
        env = context.getInterface("env", ["getAll"]);
        vars = context.getInterface("vars", ["getAll"]);
        story = context.getInterface("story", ["getAll"]);
        logger = context.getInterface("logger", ["error"]);
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function runNodeScript(nodeName, slotName) {
        return runScript(getNodeScript(nodeName, slotName));
    }
    
    function runSectionScript(sectionName, slotName) {
        return runScript(getSectionScript(sectionName, slotName));
    }
    
    function runGlobalScript(slotName) {
        return runScript(getGlobalScript(slotName));
    }
    
    function runScript(script) {
        
        var result = "";
        
        try {
            
            result = "";
            
            script(
                context,
                story.getAll(),
                env.getAll(),
                vars.getAll(),
                write,
                writeLn,
                script.line,
                script.file
            );
        }
        catch (error) {
            logger.error(
                "Cannot execute script (<" + script.file + ">@" + script.line + "):",
                error
            );
        }
        
        return result;
        
        function write(text) {
            result += api.write(text);
        }
        
        function writeLn(text) {
            result += api.writeLn(text);
        }
    }
    
    function write(text) {
        return text;
    }
    
    function writeLn(text) {
        return "\n<br />" + text;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
