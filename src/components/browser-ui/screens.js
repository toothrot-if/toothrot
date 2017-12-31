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

var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;

function none() {
    // do nothing
}

function create(context) {
    
    var storage, settings, system, interpreter, vars, story, env, focus;
    var screens, currentScreen, screenStack, curtain, confirm;
    var curtainVisible = false;
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        story = context.getComponent("story");
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
        
        curtain.setAttribute("class", "curtain");
        
        context.on("screen_click", onScreenClick);
        context.on("show_screen", removeInactiveElements);
        context.on("change_focus_mode", onFocusModeChange);
        context.on("resume_game", resumeGame);
        context.on("clear_state", onClearState);
        context.on("update_state", onUpdateState);
        
        setTimeout(function () {
            interpreter.hasCurrentSlot(function (error, exists) {
                if (exists && settings.get("continueOnStart")) {
                    continueWithCurrentSlot();
                }
                else if (settings.get("skipMainMenu")) {
                    startStory();
                }
                else {
                    run("main");
                }
            });
        }, 20);
    }
    
    function destroy() {
        
        context.removeListener("screen_click", onScreenClick);
        context.removeListener("show_screen", removeInactiveElements);
        context.removeListener("change_focus_mode", onFocusModeChange);
        context.removeListener("resume_game", resumeGame);
        context.removeListener("clear_state", onClearState);
        context.removeListener("update_state", onUpdateState);
        
        storage = null;
        settings = null;
    }
    
    function onFocusModeChange(mode) {
        if (mode === "screen" && !currentScreen) {
            run("main");
        }
    }
    
    function onClearState() {
        clearStack();
    }
    
    function onUpdateState() {
        run("main", clearStack);
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
                startStory();
            }
            else if (target === "continue") {
                continueWithCurrentSlot();
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
        
        if (currentScreen === "main") {
            clearStack();
        }
        
        focus.setMode("screen");
        
        if (isSameScreen) {
            replace();
        }
        else {
            animateScreenEntry(replace);
        }
        
        function replace() {
            
            var screenContainer = context.get("screen_container");
            var content = format(screen, settings.getAll());
            
            vars.set("storyTitle", story.getTitle());
            
            content = formatter("{$", "}")(content, vars.getAll());
            
            screenContainer.innerHTML = content;
            
            each(function (script) {
                evalScript(
                    context,
                    context.getResource("story"),
                    env.getAll(),
                    vars.getAll(),
                    script.innerHTML,
                    0,
                    "screens/" + name
                );
            }, screenContainer.querySelectorAll("script"));
            
            context.emit("show_screen", currentScreen);
            then();
        }
        
    }
    
    function back() {
        
        var lastScreen;
        
        if (screenStack.length < 1 && interpreter.isStarted()) {
            return resumeGame();
        }
        
        if (!screenStack.length) {
            return;
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
    }
    
    function continueWithCurrentSlot() {
        
        removeInactiveElements();
        interpreter.clearState();
        exitScreenMode();
        interpreter.loadCurrentSlot();
        
        setTimeout(function () {
            context.emit("screen_exit");
        }, 1000);
    }
    
    function startStory() {
        
        removeInactiveElements();
        exitScreenMode();
        interpreter.start();
        
        setTimeout(function () {
            context.emit("screen_exit");
        }, 1000);
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
        clearStack();
        
        animateScreenExit(function () {
            
            if (inBetween) {
                inBetween();
            }
        }, then);
    }
    
    function clearStack() {
        screenStack.splice(0, screenStack.length);
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
