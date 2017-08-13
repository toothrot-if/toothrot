
var clone = require("clone");

function create(context) {
    
    var features, runningElectron, remote;
    
    function init() {
        
        runningElectron = typeof window !== "undefined" &&
            typeof window.process === "object" &&
            window.process.type === "renderer";
        
        if (runningElectron) {
            remote = window.require("electron").remote;
        }
        
        features = {
            fullscreen: hasFullscreen(),
            exit: canExit()
        };
    }
    
    function destroy() {
        features = null;
    }
    
    function getFeatures() {
        return clone(features);
    }
    
    function toggleFullscreen() {
        
        var fullscreenOn = fullscreenEnabled();
        
        if (fullscreenOn) {
            exitFullscreen();
        }
        else {
            fullscreen();
        }
        
        context.emit("fullscreen_change", !fullscreenOn);
    }
    
    function fullscreenEnabled() {
        
        if (runningElectron) {
            return remote.getCurrentWindow().isFullScreen();
        }
        
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    
    function fullscreen() {
        if (runningElectron) {
            remote.getCurrentWindow().setFullScreen(true);
        }
        else {
            requestFullscreen(document.body.parentNode);
        }
    }
    
    function exitFullscreen() {
        if (runningElectron) {
            remote.getCurrentWindow().setFullScreen(false);
        }
        else {
            exitBrowserFullscreen();
        }
    }
    
    function exitBrowserFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        else if (document.mozCancelFullScreen) {
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
    
    function hasFullscreen() {
        return runningElectron;
    }
    
    function canExit() {
        return runningElectron;
    }
    
    function exit() {
        
        try {
            remote.getCurrentWindow().close();
        }
        catch (error) {
            console.error("Cannot exit: " + error);
        }
    }
    
    return {
        init: init,
        destroy: destroy,
        exit: exit,
        canExit: canExit,
        getFeatures: getFeatures,
        hasFullscreen: hasFullscreen,
        toggleFullscreen: toggleFullscreen,
        enterFullscreen: fullscreen,
        exitFullscreen: exitFullscreen
    };
}

module.exports = create;
