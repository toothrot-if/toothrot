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
var transform = require("transform-js").transform;

var evalScript = require("../../utils/evalScript.js");
var createConfirm = require("../../utils/browser/confirm.js");

var MAX_SLOTS = 20;
var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;

function none() {
    // do nothing
}

function create(context) {
    
    var storage, settings, system, interpreter, vars, env, focus;
    var screens, currentScreen, screenStack, curtain, confirm;
    var curtainVisible = false;
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        focus = context.getComponent("focus");
        system = context.getComponent("system");
        storage = context.getComponent("storage");
        screens = context.getResource("screens");
        settings = context.getComponent("settings");
        interpreter = context.getComponent("interpreter");
        
        confirm = createConfirm(context);
        
        // A stack for remembering which screen to return to.
        screenStack = [];
        
        // The curtain element is used to darken the screen when
        // transitioning from one state to the next, e.g. when
        // the section changes.
        curtain = document.createElement("div");
        
        curtain.setAttribute("class", "Curtain");
        
        context.on("screen_click", onScreenClick);
        context.on("show_screen", removeInactiveElements);
        context.on("change_focus_mode", onFocusModeChange);
        context.on("resume_game", resumeGame);
        
        setTimeout(function () {
            interpreter.hasCurrentSlot(function () {
                run("main");
            });
        }, 20);
    }
    
    function destroy() {
        
        context.removeListener("screen_click", onScreenClick);
        context.removeListener("show_screen", removeInactiveElements);
        context.removeListener("change_focus_mode", onFocusModeChange);
        context.removeListener("resume_game", resumeGame);
        
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
                interpreter.start();
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
                update(back);
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
    
    function update(then) {
        
        var container = context.get("screen_container");
        
        var elements = Array.prototype.slice.call(
            container.querySelectorAll("[data-type='setting']")
        );
        
        var values = {};
        
        elements.forEach(function (element) {
            
            var value = element.value;
            var name = element.getAttribute("data-name");
            
            if (!name) {
                return;
            }
            
            values[name] = value;
            
        });
        
        settings.update(values);
        settings.save(then);
    }
    
    function run(name, then) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
        then = then || none;
        
        if (!screen) {
            throw new Error("No such screen:" + name);
        }
        
        removeInactiveElements();
        
        if (currentScreen && !isSameScreen) {
            screenStack.push(currentScreen);
        }
        
        currentScreen = name;
        
        focus.setMode("screen");
        
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
                    update();
                }
                else {
                    animateScreenEntry(update);
                }
                
                function update() {
                    replace();
                    populateSlots(all);
                }
            });
        }
        
        function replace() {
            
            var screenContainer = context.get("screen_container");
            var content = format(screen, settings.getAll());
            
            content = formatter("{$", "}")(content, vars.getAll());
            
            screenContainer.innerHTML = content;
            
            each(function (script) {
                evalScript(
                    context,
                    context.getResource("story"),
                    env.getAll(),
                    vars.getAll(),
                    script.innerHTML,
                    0
                );
            }, screenContainer.querySelectorAll("script"));
            
            context.emit("show_screen", currentScreen);
            then();
        }
        
        function getDomNodeContent(dom) {
            
            var mockParent = document.createElement("div");
            
            mockParent.appendChild(dom.cloneNode(true));
            
            return mockParent.innerHTML;
        }
        
        function populateSlots(slots) {
            
            var i, currentSlot, tpl, emptyTpl;
            var container = context.get("screen_container");
            var slotContainer = container.querySelector("*[data-type=slots]");
            var template = container.querySelector("*[data-template-name=slot]");
            var empty = container.querySelector("*[data-template-name=empty-slot]");
            
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
        
        var screenContainer = context.get("screen_container");
        
        then = then || none;
        
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            context.emit("screen_entry", currentScreen);
            
            inBetween();
            hideCurtain(function () {
                context.emit("show_screen", currentScreen);
                then();
            });
        });
    }
    
    function animateScreenExit(then) {
        
        var screenContainer = context.get("screen_container");
        
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
        
        if (settings.get("current_slot_exists")) {
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
        
        context.get("stage_container").appendChild(curtain);
        
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
                context.get("stage_container").removeChild(curtain);
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
            interpreter.save(id, function () {
                run("save");
            });
        }
        else {
            confirm("Overwrite slot?", function (yes) {
                if (yes) {
                    interpreter.save(id, function () {
                        run("save");
                    });
                }
            });
        }
    }
    
    function loadSlot(element) {
        
        var id = element.getAttribute("data-slot-id");
        
        if (interpreter.getCurrentNodeId()) {
            confirm("Load slot and discard current progress?", function (yes) {
                if (yes) {
                    interpreter.clearState();
                    exitScreenMode(function () {
                        interpreter.load(id);
                    });
                }
            });
        }
        else {
            interpreter.clearState();
            exitScreenMode(function () {
                interpreter.load(id);
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
    
    function setOpacity(element) {
        return function (v) {
            element.style.opacity = v;
        };
    }
    
    return {
        init: init,
        destroy: destroy,
        run: run,
        back: back
    };
    
}

module.exports = create;
