
function create(context) {
    
    var joinPath;
    
    var api = context.createInterface("fileSystem", {
        copyAll: copyAll,
        readDirRecursive: readDirRecursive,
        removeRecursive: removeRecursive,
        isActualNode: isActualNode
    });
    
    function init() {
        
        var getModule = context.channel("getModule");
        var path = getModule("path");
        
        joinPath = path.join;
        
        context.connectInterface(api);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function copyAll(inputFs, inputDir, outputFs, outputDir) {
        
        var nodes = inputFs.readdirSync(inputDir).filter(api.isActualNode);
        
        nodes.forEach(function (node) {
            
            var inputPath = joinPath(inputDir, node);
            var outputPath = joinPath(outputDir, node);
            
            if (inputFs.statSync(inputPath).isDirectory()) {
                
                if (!outputFs.existsSync(outputPath)) {
                    outputFs.mkdirSync(outputPath);
                }
                
                api.copyAll(inputFs, inputPath, outputFs, outputPath);
            }
            else {
                outputFs.writeFileSync(outputPath, inputFs.readFileSync(inputPath));
            }
        });
    }
    
    function isActualNode(name) {
        return name[0] !== '.';
    }
    
    function readDirRecursive(fs, root, files, prefix) {
        
        var dir;
        
        prefix = prefix || "";
        dir = joinPath(root, prefix);
        
        files = files || [];
        
        if (!fs.existsSync(dir)) {
            return files;
        }
        
        if (fs.statSync(dir).isDirectory()) {
            fs.readdirSync(dir).filter(api.isActualNode).forEach(function (name) {
                api.readDirRecursive(fs, root, files, joinPath(prefix, name));
            });
        }
        else {
            files.push(prefix);
        }
        
        return files;
    }

    function removeRecursive(fs, dir) {
        
        var nodes = fs.readdirSync(dir);
        
        nodes.forEach(function (node) {
            
            var path;
            
            if (!api.isActualNode(node)) {
                return;
            }
            
            path = joinPath(dir, node);
            
            if (fs.statSync(path).isDirectory()) {
                api.removeRecursive(fs, path);
            }
            else {
                fs.unlinkSync(path);
            }
        });
        
        fs.rmdirSync(dir);
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
