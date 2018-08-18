
function create(context) {
    
    var path, fsHelper, logger;
    
    var api = context.createInterface("appCacheManifest", {
        create: createManifest
    });
    
    function init() {
        
        path = context.channel("getModule")("path");
        fsHelper = context.getInterface("fileSystem", ["readDirRecursive"]);
        logger = context.getInterface("logger", ["success"]);
        
        context.connectInterface(api);
        context.subscribe("builder/build.after", onBuild);
    }
    
    function destroy() {
        
        fsHelper = null;
        
        context.disconnectInterface(api);
        context.unsubscribe("builder/build.after", onBuild);
    }
    
    function onBuild(data) {
        createManifest(data.outputFs, data.browserDir);
    }
    
    function createManifest(fs, dir) {
        
        var cacheFile = "" +
            "CACHE MANIFEST\n" +
            "# Timestamp: " + Date.now() + "\n" +
            "# Automatically created by Toothrot Engine\n" +
            "\n" +
            "CACHE:\n";
        
        var cacheFilePath = path.join(dir, "cache.manifest");
        var files = fsHelper.readDirRecursive(fs, dir);
        
        files.forEach(function (file) {
            cacheFile += normalizePath(file) + "\n";
        });
        
        fs.writeFileSync(cacheFilePath, cacheFile);
        
        logger.success("Created appcache file at: " + cacheFilePath);
        
        function normalizePath(path) {
            return path.replace("\\", "/");
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
