
var EXTENSION = /\.tr\.md/;
var MAIN_FILE = "main.tr.md";
var MAIN_FILE_NAME = /main\.tr\.md/;

function create(context) {
    
    var joinPath, fileSystem;
    
    var api = context.createInterface("storyFileReader", {
        read: readStoryFiles,
        isStoryFile: isStoryFile,
        isMainStoryFile: isMainStoryFile,
        fileNameToMarker: fileNameToMarker,
        getStoryFileExtensionTest: getStoryFileExtensionTest,
        getMainStoryFileTest: getMainStoryFileTest,
        getMainStoryFileName: getMainStoryFileName
    });
    
    function init() {
        joinPath = context.channel("getModule")("path").join;
        fileSystem = context.getInterface("fileSystem", ["readDirRecursive"]);
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
        fileSystem = null;
    }
    
    function readStoryFiles(fs, dir) {
        
        var files = fileSystem.readDirRecursive(fs, dir).filter(function (file) {
            
            if (api.isMainStoryFile(file)) {
                return false;
            }
            
            return api.isStoryFile(file);
        });
        
        var mainFileName = api.getMainStoryFileName();
        var mainFile = joinPath(dir, mainFileName);
        var content = api.fileNameToMarker(mainFileName) + "\n";
        
        content += fs.readFileSync(mainFile);
        
        files.forEach(function (file) {
            
            var fileContent = fs.readFileSync(joinPath(dir, file));
            
            content += api.fileNameToMarker(file) + "\n";
            content += fileContent;
        });
        
        return content;
    }
    
    function isMainStoryFile(fileName) {
        return api.getMainStoryFileTest().test(fileName);
    }
    
    function isStoryFile(fileName) {
        return api.getStoryFileExtensionTest().test(fileName);
    }
    
    function getMainStoryFileName() {
        return MAIN_FILE;
    }
    
    function fileNameToMarker(fileName) {
        return "<<<" + fileName + ">>>";
    }
    
    function getMainStoryFileTest() {
        return MAIN_FILE_NAME;
    }
    
    function getStoryFileExtensionTest() {
        return EXTENSION;
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
