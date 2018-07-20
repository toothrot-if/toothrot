
function decodeResources(resources) {
    return JSON.parse(decodeURIComponent(window.atob(resources)));
}

function create(context) {
    
    // @ts-ignore
    var resources = decodeResources(window.toothrotResources);
    
    var api = context.createInterface("resources", {
        get: getResource,
        has: hasResource
    });
    
    context.connectInterface(api);
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function getResource(name) {
        return resources[name];
    }
    
    function hasResource(name) {
        return name in resources;
    }
    
    return {
        destroy: destroy
    };
}

module.exports = {
    create: create
};
