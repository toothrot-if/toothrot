
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
    
    var interpreter, dropZone, confirm, sourceImage, resources, logger, cartridge, confirmation;
    
    var cartridges = context.createInterface("cartridges", {
        getSourceImage: getCartridgeSourceImage,
        showDropZone: showDropZone,
        hideDropZone: hideDropZone,
        generate: generateCartridge,
        getImageElements: getImageElements,
        getLinkElements: getLinkElements,
        readDatacard: readDatacard,
        readFile: readFile
    });
    
    function init() {
        
        var getModule = context.channel("getModule");
        
        cartridge = getModule("png-cartridge");
        
        context.connectInterface(cartridges);
        
        confirmation = context.getInterface("uiConfirmations", ["create"]);
        interpreter = context.getInterface("interpreter", ["getState", "updateState"]);
        resources = context.getInterface("resources", ["get", "has"]);
        logger = context.getInterface("logger", ["log", "error"]);
        
        confirm = confirmation.create();
        dropZone = document.createElement("div");
        sourceImage = cartridges.getSourceImage();
        
        dropZone.setAttribute("class", "global-drop-zone");
        document.body.appendChild(dropZone);
        
        window.addEventListener("dragenter", cartridges.showDropZone);
        dropZone.addEventListener("dragenter", handleDragOver);
        dropZone.addEventListener("dragover", handleDragOver);
        dropZone.addEventListener("dragleave", cartridges.hideDropZone);
        dropZone.addEventListener("drop", handleDrop);
        
        context.on("showScreen", onShowScreen);
        context.on("cartridge_file_change", onFileChange);
        
    }
    
    function destroy() {
        
        context.disconnectInterface(cartridges);
        
        window.removeEventListener("dragenter", cartridges.showDropZone);
        context.removeListener("showScreen", onShowScreen);
        context.removeListener("cartridge_file_change", onFileChange);
        
        logger = null;
        resources = null;
        interpreter = null;
        confirm = null;
        dropZone = null;
        sourceImage = null;
        
    }
    
    function runScreenScript() {
        
        var file = document.querySelector(".file");
        var uploadContainer = document.querySelector(".upload-container");
        var downloadLink = document.querySelector(".download-link");
        
        function onClick(event) {
            event.stopPropagation();
        }
        
        function onFileChange(event) {
            context.publish("cartridge_file_change", event);
        }
        
        uploadContainer.addEventListener("click", onClick);
        downloadLink.addEventListener("click", onClick);
        file.addEventListener("change", onFileChange);
        
    }
    
    function onShowScreen(screen) {
        if (screen === SCREEN_NAME) {
            runScreenScript();
            cartridges.generate();
        }
    }
    
    function onFileChange(event) {
        
        var file = event.target.files[0];
        
        event.preventDefault();
        
        cartridges.readFile(file);
    }
    
    function generateCartridge() {
        
        var cart = cartridge.save(interpreter.getState(), sourceImage);
        
        cartridges.getImageElements().forEach(function (image) {
            image.src = cart.src;
        });
        
        cartridges.getLinkElements().forEach(function (link) {
            link.href = cart.src;
        });
    }
    
    function handleDrop(event) {
        
        var file = event.dataTransfer.files[0];
        
        event.preventDefault();
        cartridges.hideDropZone();
        cartridges.readFile(file);
    }
    
    function readFile(file) {
        if (file && (/image\/png/).test(file.type)) {
            cartridges.readDatacard(file);
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
                    logger.error(error);
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
        
        var uri = resources.get("images")[SOURCE_IMAGE_ID];
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

module.exports = {
    name: "cartridges",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["browser"],
    create: create
};
