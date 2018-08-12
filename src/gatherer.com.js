
function create(context) {
    
    var path, createHost, createGatherer, createFormatter, format;
    
    var api = context.createInterface("toothrotGatherer", {
        gather: gather,
        resolveResources: resolveResources,
        renderTemplate: renderTemplate
    });
    
    function init() {
        
        var getModule = context.channel("getModule");
        
        path = getModule("path");
        createHost = getModule("multiversum/host").create;
        createGatherer = getModule("multiversum/gatherer").create;
        createFormatter = getModule("vrep").create;
        
        format = createFormatter("'{{$", "}}'", function (value) {
            return value;
        });
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function gather(options) {
        
        var gatherer, components;
        var resources = {};
        var moduleNames = [];
        var host = createHost();
        
        host.connect("getModule", function () {
            return null;
        });
        
        options.prepareHost(host);
        
        gatherer = createGatherer(host);
        
        gatherer.init();
        
        components = gatherer.gather(options.paths, {
            patterns: ["**/*.com.json"],
            filter: function (component, componentPath) {
                
                if (component.application !== "toothrot") {
                    return false;
                }
                
                if (component.applicationSteps.indexOf("run") < 0) {
                    return false;
                }
                
                if (Array.isArray(component.modules)) {
                    component.modules.forEach(function (name) {
                        if (moduleNames.indexOf(name) < 0) {
                            moduleNames.push(name);
                        }
                    });
                }
                
                if (component.resources && typeof component.resources === "object") {
                    Object.keys(component.resources).forEach(function (key) {
                        
                        resources[key] = path.join(
                            path.dirname(componentPath),
                            component.resources[key]
                        );
                        
                    });
                }
                
                return true;
            }
        });
        
        return {
            resources: resources,
            dependencies: moduleNames,
            components: components
        };
        
    }
    
    function resolveResources(fs, resources) {
        
        var count = 0;
        var files = {};
        var masked = {};
        var resolved = {};
        
        Object.keys(resources).forEach(function (key) {
            
            var id;
            var filePath = resources[key];
            
            if (filePath in files) {
                resolved[key] = files[filePath];
                return;
            }
            
            id = getNextId(filePath);
            
            masked[id] = "" + fs.readFileSync(filePath);
            files[filePath] = id;
            resolved[key] = id;
        });
        
        return {
            files: masked,
            resources: resolved
        };
        
        function getNextId(filePath) {
            
            var id = "<toothrot_resource_" + count + ">/" + path.basename(filePath);
            
            count += 1;
            
            return id;
        }
    }
    
    function renderTemplate(fs, template, componentTemplate, options) {
        
        var collected = gather(options);
        
        var dependencies = {};
        var componentContents = {};
        var resources = api.resolveResources(fs, collected.resources);
        
        collected.dependencies.forEach(function (name) {
            dependencies[name] = "require('" + name + "')";
        });
        
        Object.keys(collected.components).forEach(function (key) {
            
            var id = "<component_path_" + Math.round(Math.random() * 10000000) + ">";
            var component = collected.components[key];
            var filePath = path.join(id, path.basename(component.file));
            var componentContent = "" + fs.readFileSync(component.file);
            
            componentContents[id] = wrapComponentContent(componentContent);
            
            // @ts-ignore
            component.create = "{{$" + id + "}}";
            component.file = filePath;
            component.definitionFile = path.join(id, path.basename(component.definitionFile));
        });
        
        return format(template, {
            buildTime: (new Date()).toUTCString(),
            mods: insertRequires(JSON.stringify(dependencies, null, 4)),
            components: formatComponents(collected.components, componentContents),
            resourceIds: JSON.stringify(resources.resources, null, 4),
            resourceFiles: JSON.stringify(resources.files, null, 4)
        });
        
        function insertRequires(input) {
            return input.replace(/"require\((.*?)\)"/g, "require($1)");
        }
        
        function wrapComponentContent(content) {
            return format(componentTemplate, {
                content: content
            });
        }
        
        function formatComponents(components, contents) {
            
            var format = createFormatter('"{{$', '}}"');
            
            return format(JSON.stringify(components, null, 4), contents);
        }
        
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
