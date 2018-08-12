
function create(context) {
    
    var features, runningElectron, remote, logger, clone;
    
    var system = context.createInterface("system", {
        exit: exit,
        canExit: canExit,
        fullscreen: fullscreen,
        getFeatures: getFeatures,
        hasFullscreen: hasFullscreen,
        hasBrowserFullscreen: hasBrowserFullscreen,
        toggleFullscreen: toggleFullscreen,
        enterFullscreen: fullscreen,
        exitFullscreen: exitFullscreen,
        fullscreenEnabled: fullscreenEnabled,
        requestFullscreen: requestFullscreen,
        exitBrowserFullscreen: exitBrowserFullscreen
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        clone = getModule("clone");
        
        context.connectInterface(system);
        
        logger = context.getInterface("logger", ["log", "error"]);
        
        runningElectron = typeof window !== "undefined" &&
            // @ts-ignore
            typeof window.process === "object" &&
            // @ts-ignore
            window.process.type === "renderer";
        
        if (runningElectron) {
            // @ts-ignore
            remote = window.require("electron").remote;
        }
        
        features = {
            fullscreen: system.hasFullscreen(),
            exit: system.canExit()
        };
    }
    
    function destroy() {
        features = null;
        context.disconnectInterface(system);
    }
    
    function getFeatures() {
        return clone(features);
    }
    
    function toggleFullscreen() {
        
        var fullscreenOn = system.fullscreenEnabled();
        
        if (fullscreenOn) {
            system.exitFullscreen();
        }
        else {
            system.fullscreen();
        }
        
        context.publish("fullscreen_change", !fullscreenOn);
    }
    
    function fullscreenEnabled() {
        
        if (runningElectron) {
            return remote.getCurrentWindow().isFullScreen();
        }
        
        return document.fullscreenElement ||
            // @ts-ignore
            document.mozFullScreenElement ||
            // @ts-ignore
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    
    function fullscreen() {
        if (runningElectron) {
            remote.getCurrentWindow().setFullScreen(true);
        }
        else {
            system.requestFullscreen(document.body.parentNode);
        }
    }
    
    function exitFullscreen() {
        if (runningElectron) {
            remote.getCurrentWindow().setFullScreen(false);
        }
        else {
            system.exitBrowserFullscreen();
        }
    }
    
    function exitBrowserFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if ("msExitFullscreen" in document) {
            // @ts-ignore
            document.msExitFullscreen();
        }
        else if ("mozCancelFullScreen" in document) {
            // @ts-ignore
            document.mozCancelFullScreen();
        }
        else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
    
    function requestFullscreen(element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        }
        else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        }
        else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
    }
    
    function hasBrowserFullscreen() {
        return "requestFullscreen" in document.documentElement ||
            "msRequestFullscreen" in document.documentElement ||
            "mozRequestFullScreen" in document.documentElement ||
            "webkitRequestFullscreen" in document.documentElement;
    }
    
    function hasFullscreen() {
        return runningElectron || system.hasBrowserFullscreen();
    }
    
    function canExit() {
        return runningElectron;
    }
    
    function exit() {
        
        try {
            remote.getCurrentWindow().close();
        }
        catch (error) {
            logger.error("Cannot exit: " + error);
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "system",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["browser"],
    create: create
};
