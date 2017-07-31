//
// # Screens component
//
// Screens can be used to implement simple connected menus.
// Screens are written in pure HTML and can be styled with CSS.
// When an element is clicked, the event bubbles up to the
// screen container where it is decided whether the click means
// anything and executes any associated actions (e.g. a click
// on a button is supposed to update something or go to another
// screen).
//

var each = require("enjoy-core/each");
var formatter = require("vrep").create;
var format = require("vrep").format;

var evalScript = require("../utils/evalScript.js");

var MAX_SLOTS = 20;
var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;

function none() {
    // do nothing
}

function create(context) {
    
    var storage, settings, system, interpreter, story, vars, env;
    var screens, currentScreen, screenStack, screenContainer;
    var curtainVisible = false;
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        story = context.getComponent("story");
        system = context.getComponent("system");
        storage = context.getComponent("storage");
        screens = context.getResource("screens");
        settings = context.getComponent("settings");
        interpreter = context.getComponent("interpreter");
        
        // A stack for remembering which screen to return to.
        screenStack = [];
        
        screenContainer.addEventListener("click", onScreenClick);
        
        context.on("show_screen", removeInactiveElements);
        context.on("change_focus_mode", onFocusModeChange);
    }
    
    function destroy() {
        
        context.removeListener("show_screen", removeInactiveElements);
        context.removeListener("change_focus_mode", onFocusModeChange);
        
        storage = null;
        settings = null;
    }
    
    function onFocusModeChange(mode) {
        if (mode === "screen" && !currentScreen) {
            run("main");
        }
    }
    
    function onScreenClick(event) {
        
        var element = event.target;
        var type = element.getAttribute("data-type");
        var target = element.getAttribute("data-target");
        var action = element.getAttribute("data-action");
        
        event.stopPropagation();
        event.preventDefault();
        
        if (type === "menu-item") {
            if (target in screens) {
                if (element.getAttribute("data-confirm") === "returnToTitle") {
                    confirm("Quit to title and discard progress?", function (yes) {
                        if (yes) {
                            interpreter.clearState();
                            run(target);
                        }
                    });
                }
                else {
                    run(target);
                }
            }
            else if (target === "start") {
                exitScreenMode();
                interpreter.runNode(story.getNode("start"));
            }
            else if (target === "continue") {
                interpreter.clearState();
                exitScreenMode();
                interpreter.loadCurrentSlot();
            }
            else if (target === "resume") {
                resumeGame();
            }
            else if (target === "exit") {
                confirm("Do you really want to quit?", function (yes) {
                    if (yes) {
                        system.exit();
                    }
                });
            }
            else if (target === "back") {
                back();
            }
            else if (target === "saveSettings") {
                settings.update(back);
            }
        }
        else if (type === "slot-button") {
            if (action === "save") {
                saveSlot(element);
            }
            else if (action === "load") {
                loadSlot(element);
            }
            else if (action === "delete") {
                deleteSlot(element);
            }
        }
    }
    
    function run(name, then) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
        then = then || none;
        
        focus.setMode("screen");
        
        if (!screen) {
            throw new Error("No such screen:" + name);
        }
        
        removeInactiveElements();
        
        if (currentScreen && !isSameScreen) {
            screenStack.push(currentScreen);
        }
        
        currentScreen = name;
        
        if (name === "save") {
            showSaveScreen(isSameScreen);
        }
        else {
            if (isSameScreen) {
                replace();
            }
            else {
                animateScreenEntry(replace);
            }
        }
        
        function showSaveScreen(isSameScreen) {
            storage.all(function (error, all) {
                
                if (error) {
                    return;
                }
                
                if (isSameScreen) {
                    replace();
                }
                else {
                    animateScreenEntry(replace);
                }
                
                function replace() {
                    replace();
                    populateSlots(all);
                }
            });
        }
        
        function replace() {
            
            var content = format(screen, settings.getAll());
            
            content = formatter("{$", "}")(content, vars.getAll());
            
            screenContainer.innerHTML = content;
            
            each(function (script) {
                evalScript(
                    context.getResource("story"),
                    env.getAll(),
                    vars.getAll(),
                    script.innerHTML,
                    0
                );
            }, screenContainer.querySelectorAll("script"));
            
            context.emit("show_screen");
            then();
        }
        
        function getDomNodeContent(dom) {
            
            var mockParent = document.createElement("div");
            
            mockParent.appendChild(dom.cloneNode(true));
            
            return mockParent.innerHTML;
        }
        
        function populateSlots(slots) {
            
            var slotContainer = screenContainer.querySelector("*[data-type=slots]");
            var template = screenContainer.querySelector("*[data-template-name=slot]");
            var empty = screenContainer.querySelector("*[data-template-name=empty-slot]");
            var i, currentSlot, tpl, emptyTpl;
            
            template.parentNode.removeChild(template);
            empty.parentNode.removeChild(empty);
            
            slotContainer.innerHTML = "";
            
            tpl = getDomNodeContent(template);
            emptyTpl = getDomNodeContent(empty);
            
            for (i = 0; i < MAX_SLOTS; i += 1) {
                
                currentSlot = slots["slot_" + (i + 1)];
                
                if (currentSlot) {
                    slotContainer.innerHTML += insertVars(tpl, currentSlot, i + 1);
                }
                else {
                    slotContainer.innerHTML += insertVars(emptyTpl, null, i + 1);
                }
            }
            
            if (!interpreter.getCurrentNodeId()) {
                removeSaveButtons();
            }
            
            function removeSaveButtons() {
                
                var buttons = document.querySelectorAll("*[data-type=slot-button]");
                
                [].forEach.call(buttons, function (button) {
                    
                    if (button.getAttribute("data-action") !== "save") {
                        return;
                    }
                    
                    button.parentNode.removeChild(button);
                });
            }
            
            function insertVars(tpl, slot, i) {
                
                var data;
                
                tpl = tpl.replace(/\{id\}/g, "slot_" + i);
                tpl = tpl.replace(/\{i\}/g, "" + i);
                
                if (!slot) {
                    return tpl;
                }
                
                data = JSON.parse(slot.data);
                
                tpl = tpl.replace(/\{name\}/g, slot.name);
                tpl = tpl.replace(/\{text\}/g, trimText(data.text, 100) || "???");
                tpl = tpl.replace(/\{time\}/g, formatTime(slot.time));
                
                return tpl;
            }
        }
    }
    
    function trimText(text, length) {
        return (text.length > length ? text.substring(0, length - 3) + "..." : text);
    }
    
    function formatTime(time) {
        
        var date = new Date(time);
        
        return "" + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() +
            " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
            
        function pad(num) {
            return (num < 10 ? "0": "") + num;
        }
    }
    
    function back() {
        
        var lastScreen;
        
        if (screenStack.length < 1) {
            return resumeGame();
        }
        
        lastScreen = screenStack.pop();
        
        if (!screenStack.length) {
            currentScreen = undefined;
        }
        
        run(lastScreen);
    }
    
    function animateScreenEntry(inBetween, then) {
        
        then = then || none;
        
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            context.emit("screen_entry");
            
            inBetween();
            hideCurtain(function () {
                context.emit("show_screen");
                then();
            });
        });
    }
    
    function animateScreenExit(then) {
        showCurtain(function () {
            
            focus.setMode("node");
            
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            context.emit("screen_exit");
            
            hideCurtain(then);
        });
    }
    
    function removeInactiveElements() {
        removeFeatureElements();
        removeContinueButton();
    }
    
    function removeFeatureElements() {
        
        var features = system.getFeatures();
        
        for (var feature in features) {
            if (!features[feature]) {
                removeElementsForFeature(feature);
            }
        }
    }
    
    function removeContinueButton() {
        
        var buttons;
        
        if (currentSlotExists) {
            return;
        }
        
        buttons = document.querySelectorAll("*[data-target=continue]");
        
        [].forEach.call(buttons || [], function (button) {
            button.parentNode.removeChild(button);
        });
    }
    
    function removeElementsForFeature(feature) {
        
        var elements = document.querySelectorAll("*[data-feature=" + feature + "]") || [];
        
        [].forEach.call(elements, function (element) {
            element.parentNode.removeChild(element);
        });
    }
    
    function showCurtain(then) {
        
        if (curtainVisible) {
            return then();
        }
        
        container.appendChild(curtain);
        curtain.style.display = "";
        curtainVisible = true;
        
        setTimeout(function () {
            transform(0, 1, setOpacity(curtain), {duration: SCREEN_FADE_IN}, then);
        }, 50);
        
    }
    
    function hideCurtain(then) {
        
        if (!curtainVisible) {
            return then();
        }
        
        curtainVisible = false;
        
        transform(1, 0, setOpacity(curtain), {duration: SCREEN_FADE_OUT}, function () {
            
            curtain.style.display = "none";
            
            try {
                container.removeChild(curtain);
            }
            catch (error) {
                console.error(error);
            }
            
            if (then) {
                then();
            }
        });
    }
    
    function resumeGame() {
        
        animateScreenExit();
        focus.setMode("node");
        
        currentScreen = undefined;
        
        return;
    }
    
    function saveSlot(element) {
        
        var id = element.getAttribute("data-slot-id");
        var isEmpty = !!element.getAttribute("data-is-empty");
        
        if (isEmpty) {
            save(id, function () {
                runScreen("save");
            });
        }
        else {
            confirm("Overwrite slot?", function (yes) {
                if (yes) {
                    save(id, function () {
                        runScreen("save");
                    });
                }
            });
        }
    }
    
    function loadSlot(element) {
        
        var id = element.getAttribute("data-slot-id");
        
        if (currentNode) {
            confirm("Load slot and discard current progress?", function (yes) {
                if (yes) {
                    clearState();
                    exitScreenMode(function () {
                        load(id);
                    });
                }
            });
        }
        else {
            clearState();
            exitScreenMode(function () {
                load(id);
            });
        }
    }
    
    function deleteSlot(element) {
        
        var id = element.getAttribute("data-slot-id");
        
        confirm("Really delete slot?", function (yes) {
            if (yes) {
                storage.remove(id);
                screens.run("save");
            }
        });
    }
    
    function exitScreenMode(inBetween, then) {
        
        currentScreen = undefined;
        
        focus.setMode("node");
        
        screenStack.splice(0, screenStack.length);
        
        animateScreenExit(function () {
            
            if (inBetween) {
                inBetween();
            }
        }, then);
    }
    
    return {
        init: init,
        destroy: destroy
    };
    
}

module.exports = create;
