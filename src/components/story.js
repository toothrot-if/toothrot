
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
        getHierarchy: getHierarchy
    };
}

module.exports = create;
