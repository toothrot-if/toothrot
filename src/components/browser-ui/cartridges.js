
var cartridge = require("png-cartridge");
var createConfirm = require("../../utils/browser/confirm.js");

var SCREEN_NAME = "cartridges";
var LINK_TYPE = "cartridge-link";
var IMAGE_TYPE = "cartridge-image";
var LINK_QUERY = "[data-type='" + LINK_TYPE + "']";
var IMAGE_QUERY = "[data-type='" + IMAGE_TYPE + "']";

var SOURCE_IMAGE_ID = "images/datacard.png";

function getImageElements() {
    return toArray(document.querySelectorAll(IMAGE_QUERY));
}

function getLinkElements() {
    return toArray(document.querySelectorAll(LINK_QUERY));
}

function toArray(collection) {
    return Array.prototype.slice.call(collection);
}

function create(context) {
    
    var interpreter, dropZone, confirm, sourceImage;
    
    function init() {
        
        confirm = createConfirm(context);
        interpreter = context.getComponent("interpreter");
        dropZone = document.createElement("div");
        sourceImage = getCartridgeSourceImage();
        
        dropZone.setAttribute("class", "global-drop-zone");
        document.body.appendChild(dropZone);
        
        window.addEventListener("dragenter", showDropZone);
        dropZone.addEventListener("dragenter", handleDragOver);
        dropZone.addEventListener("dragover", handleDragOver);
        dropZone.addEventListener("dragleave", hideDropZone);
        dropZone.addEventListener("drop", handleDrop);
        
        context.on("show_screen", onShowScreen);
        context.on("cartridge_file_change", onFileChange);
    }
    
    function destroy() {
        window.removeEventListener("dragenter", showDropZone);
        context.removeListener("show_screen", onShowScreen);
        context.removeListener("cartridge_file_change", onFileChange);
    }
    
    function onShowScreen(screen) {
        if (screen === SCREEN_NAME) {
            generateCartridge();
        }
    }
    
    function onFileChange(event) {
        
        var file = event.target.files[0];
        
        event.preventDefault();
        
        readFile(file);
    }
    
    function generateCartridge() {
        
        var cart = cartridge.save(interpreter.getState(), sourceImage);
        
        getImageElements().forEach(function (image) {
            image.src = cart.src;
        });
        
        getLinkElements().forEach(function (link) {
            link.href = cart.src;
        });
    }
    
    function handleDrop(event) {
        
        var file = event.dataTransfer.files[0];
        
        event.preventDefault();
        hideDropZone();
        readFile(file);
    }
    
    function readFile(file) {
        if (file && (/image\/png/).test(file.type)) {
            readDatacard(file);
        }
    }
    
    function handleDragOver(event) {
        event.dataTransfer.dropEffect = "copy";
        event.preventDefault();
    }
    
    function showDropZone() {
        dropZone.style.visibility = "visible";
        dropZone.style.opacity = 1;
    }
    
    function hideDropZone() {
        dropZone.style.visibility = "hidden";
        dropZone.style.opacity = 0;
    }
    
    function readDatacard(file) {
        
        var reader = new FileReader();
        
        reader.onload = function (event) {
            
            var data;
            var image = new Image();
            
            document.body.appendChild(image);
            
            image.src = event.target.result;
            
            setTimeout(function () {
                
                try {
                    data = cartridge.load(image);
                }
                catch (error) {
                    document.body.removeChild(image);
                    console.error(error);
                    return;
                }
                
                document.body.removeChild(image);
                
                confirm("Load state from datacard and discard progress?", function (yes) {
                    if (yes) {
                        interpreter.updateState(data);
                    }
                });
                
            }, 100);
        };
        
        reader.readAsDataURL(file);
    }
    
    function getCartridgeSourceImage() {
        
        var uri = context.getResource("images")[SOURCE_IMAGE_ID];
        var image = new Image();
        
        image.src = uri;
        image.style.opacity = "0";
        
        document.body.appendChild(image);
        
        return image;
    }
    
    return {
        init: init,
        destroy: destroy
    };
    
}

module.exports = create;
