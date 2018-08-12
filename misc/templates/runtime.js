
/* ----------------------------------------------------------------------------------------------
    
    Toothrot Engine Runtime (v'{{$version}}')
    
    Build Time: '{{$buildTime}}'
   
   ---------------------------------------------------------------------------------------------- */

(function () {
    
    var app;
    
    var modules = {
        DependencyGraph: require("dependency-graph").DepGraph
    };
    
    var version = "'{{$version}}'";
    var createApp = require("multiversum/app").create;
    var createHost = require("multiversum/host").create;
    
    var host = createHost();
    
    host.connect("getEngineVersion", function () {
        return version;
    });
    
    host.connect("getModule", function (name) {
        return modules[name];
    });
    
    host.connect("getResource", function () {
        return null;
    });
    
    app = createApp(host);
    
    app.on("error", console.error.bind(console));
    app.on("app/error", console.error.bind(console));
    
    // @ts-ignore
    window.TOOTHROT = app;
    
}());
