
function create(context) {
    
    var story, resources;
    
    var api = context.createInterface("story", {
        getNode: getNode,
        hasNode: hasNode,
        getSection: getSection,
        hasSection: hasSection,
        getMeta: getMeta,
        hasMeta: hasMeta,
        getTitle: getTitle,
        getAll: getAll,
        getHierarchy: getHierarchy,
        getSettings: getSettings,
        getGlobalScripts: getGlobalScripts,
        hasGlobalScript: hasGlobalScript,
        getGlobalScript: getGlobalScript,
        getNodeScript: getNodeScript,
        hasNodeScript: hasNodeScript,
        getSectionScript: getSectionScript,
        hasSectionScript: hasSectionScript,
        getHead: getHead,
        getNodeIds: getNodeIds,
        getSectionIds: getSectionIds
    });
    
    function init() {
        context.connectInterface(api);
        resources = context.getInterface("resources", ["get", "has"]);
        story = resources.get("story");
    }
    
    function destroy() {
        context.disconnectInterface(api);
        story = null;
        resources = null;
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
        return api.getMeta("title");
    }
    
    function getAll() {
        return story;
    }
    
    function getHierarchy() {
        return story.head.hierarchy;
    }
    
    function getSettings() {
        return story.head.settings;
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
    
    function getNodeScript(node, slot) {
        
        if (!api.hasNodeScript(node, slot)) {
            return;
        }
        
        return api.getNode(node).scripts[slot];
    }
    
    function hasNodeScript(node, slot) {
        return api.hasNode(node) && (slot in api.getNode(node).scripts);
    }
    
    function getSectionScript(section, slot) {
        
        if (!api.hasSectionScript(section, slot)) {
            return;
        }
        
        return api.getSection(section).scripts[slot];
    }
    
    function hasSectionScript(section, slot) {
        return api.hasSection(section) && (slot in api.getSection(section).scripts);
    }
    
    function getHead() {
        return story.head;
    }
    
    function getNodeIds() {
        return Object.keys(story.nodes);
    }
    
    function getSectionIds() {
        return Object.keys(story.sections);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "story",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["any"],
    create: create
};
