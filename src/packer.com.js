
function create(context) {
    
    var parser, toDataUri, normalize;
    
    var api = context.createInterface("packer", {
        pack: pack,
        pruneStory: pruneStory,
        readStoryFiles: readStoryFiles
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        toDataUri = getModule("datauri").sync;
        normalize = getModule("path").normalize;
        parser = context.getInterface("parser", ["parse"]);
        
        context.connectInterface(api);
    }
    
    function destroy() {
        
        parser = null;
        
        context.disconnectInterface(api);
    }
    
    function readStoryFiles(fs, dir) {
        
        var mainFile = normalize(dir + "/story.trot.md");
        var content = "<<<story.trot.md>>>\n";
        var files = getAdditionalStoryFiles(fs, dir);
        
        content += fs.readFileSync(mainFile);
        
        files.forEach(function (file) {
            
            var fileContent = fs.readFileSync(normalize(dir + "/" + file));
            
            content += "<<<" + file + ">>>\n";
            content += fileContent;
        });
        
        return content;
    }
    
    function getAdditionalStoryFiles(fs, dir) {
        
        var allFiles = fs.readdirSync(dir);
        
        return allFiles.filter(function (file) {
            return (/\.trot\.ext\.md/).test(file);
        });
    }
    
    function pack(fs, dir) {
        
        var story, storyFilesContent, templatePath, screenPath, imagePath, astFile, templateFiles,
            screenFiles, imageFiles, bundle;
        
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
            storyFilesContent = api.readStoryFiles(fs, dir);
            parser.parse("" + storyFilesContent, function (errors, ast) {
                
                if (errors) {
                    throw errors;
                }
                
                story = ast;
            });
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
        
        return JSON.stringify(bundle, null, 4);
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
