
function create(context) {
    
    var parser, toDataUri, normalize, storyFileReader;
    
    var api = context.createInterface("packer", {
        pack: pack,
        pruneStory: pruneStory
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        toDataUri = getModule("datauri").sync;
        normalize = getModule("path").normalize;
        parser = context.getInterface("parser", ["parse"]);
        storyFileReader = context.getInterface("storyFileReader", ["read"]);
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        parser = null;
        storyFileReader = null;
        
        context.disconnectInterface(api);
    }
    
    function pack(fs, dir, then) {
        
        var story, storyFilesContent, templatePath, screenPath, imagePath, astFile, templateFiles,
            screenFiles, imageFiles, bundle, errors;
        
        dir = normalize(dir + "/resources/");
        templatePath = normalize(dir + "/templates/");
        screenPath = normalize(dir + "/screens/");
        imagePath = normalize(dir + "/images/");
        astFile = normalize(dir + "/ast.json");
        templateFiles = fs.readdirSync(templatePath);
        screenFiles = fs.readdirSync(screenPath);
        imageFiles = fs.readdirSync(imagePath);
        
        //
        // If there's an AST file in the resources folder (created by e.g. toothrot builder)
        // we use it instead of parsing the story file.
        //
        if (fs.existsSync(astFile)) {
            story = JSON.parse("" + fs.readFileSync(astFile));
        }
        else {
            
            storyFilesContent = storyFileReader.read(fs, dir);
            
            parser.parse("" + storyFilesContent, function (storyErrors, ast) {
                if (storyErrors) {
                    errors = storyErrors;
                }
                else {
                    story = ast;
                }
            });
            
            if (errors) {
                return then(errors);
            }
        }
        
        bundle = {
            meta: {
                buildTime: Date.now()
            },
            templates: {},
            screens: {},
            images: {},
            story: story
        };
        
        templateFiles.forEach(function (file) {
            
            var name = file.split(".")[0];
            
            bundle.templates[name] = "" + fs.readFileSync(templatePath + file);
        });
        
        screenFiles.forEach(function (file) {
            
            var name = file.split(".")[0];
            
            bundle.screens[name] = "" + fs.readFileSync(screenPath + file);
        });
        
        imageFiles.forEach(function (file) {
            
            var name = "images/" + file;
            
            bundle.images[name] = toDataUri(imagePath + file);
        });
        
        api.pruneStory(story);
        
        return then(null, JSON.stringify(bundle, null, 4));
    }
    
    function pruneStory(story) {
        
        Object.keys(story.nodes).forEach(function (key) {
            delete story.nodes[key].raw;
        });
        
        Object.keys(story.sections).forEach(function (key) {
            delete story.sections[key].raw;
        });
        
        delete story.head.content;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
