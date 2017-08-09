
function create(context) {
    
    var story;
    
    function init() {
        story = context.getResource("story");
    }
    
    function destroy() {
        story = null;
    }
    
    function getNode(name) {
        return story.nodes[name];
    }
    
    function hasNode(name) {
        return (name in story.nodes);
    }
    
    function getSection(name) {
        return story.sections[name];
    }
    
    function hasSection(name) {
        return (name in story.sections);
    }
    
    function getMeta(name) {
        return story.meta[name];
    }
    
    function hasMeta(name) {
        return (name in story.meta);
    }
    
    function getTitle() {
        return getMeta("title");
    }
    
    function getAll() {
        return story;
    }
    
    function getHierarchy() {
        return story.head.hierarchy;
    }
    
    function getGlobalScripts() {
        return story.head.scripts;
    }
    
    function hasGlobalScript(name) {
        return (name in story.head.scripts);
    }
    
    function getGlobalScript(name) {
        return story.head.scripts[name];
    }
    
    function getHead() {
        return story.head;
    }
    
    return {
        init: init,
        destroy: destroy,
        getNode: getNode,
        hasNode: hasNode,
        getSection: getSection,
        hasSection: hasSection,
        getMeta: getMeta,
        hasMeta: hasMeta,
        getTitle: getTitle,
        getAll: getAll,
        getHierarchy: getHierarchy,
        getGlobalScripts: getGlobalScripts,
        getGlobalScript: getGlobalScript,
        hasGlobalScript: hasGlobalScript,
        getHead: getHead
    };
}

module.exports = create;
