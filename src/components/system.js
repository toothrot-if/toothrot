
var clone = require("clone");

function create(context) {
    
    var fullscreenMode, features;
    
    function init() {
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
        
        var fullscreenOn = fullscreenEnabled() || (typeof nw !== "undefined" && fullscreenMode);
        
        if (fullscreenOn) {
            exitFullscreen();
        }
        else {
            fullscreen();
        }
        
        context.emit("fullscreen_change", !fullscreenOn);
    }
    
    function fullscreenEnabled() {
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    
    function fullscreen() {
        
        fullscreenMode = true;
        
        if (typeof nw !== "undefined") {
            nwEnterFullscreen();
        }
        else {
            requestFullscreen(document.body.parentNode);
        }
    }
    
    function exitFullscreen() {
        
        fullscreenMode = false;
        
        if (typeof nw !== "undefined") {
            nwExitFullscreen();
        }
        else {
            exitBrowserFullscreen();
        }
    }
    
    function nwEnterFullscreen() {
        window.require('nw.gui').Window.get().enterKioskMode();
    }
    
    function nwExitFullscreen() {
        window.require('nw.gui').Window.get().leaveKioskMode();
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
        return typeof nw !== undefined;
    }
    
    function canExit() {
        return typeof nw !== undefined;
    }
    
    function exit() {
        try {
            var gui = window.require("nw.gui");
            gui.App.quit();
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
