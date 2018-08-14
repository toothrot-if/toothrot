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

var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;

function none() {
    // do nothing
}

function create(context) {
    
    var storage, settings, system, interpreter, vars, story, env, focus, logger, createConfirm,
        screens, currentScreen, stack, curtain, confirm, resources, formatter, format, transform;
    
    var curtainVisible = false;
    
    var api = context.createInterface("uiScreens", {
        run: run,
        back: back,
        getScreenFadeInTime: getScreenFadeInTime,
        getScreenFadeOutTime: getScreenFadeOutTime,
        getScreenScripts: getScreenScripts
    });
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        format = getModule("vrep").format;
        formatter = getModule("vrep").create;
        transform = getModule("transform-js").transform;
        createConfirm = context.channel("uiConfirmations/create").call;
        
        context.connectInterface(api);
        
        env = context.getInterface("env", ["getAll"]);
        vars = context.getInterface("vars", ["set", "getAll"]);
        story = context.getInterface("story", ["getTitle"]);
        focus = context.getInterface("focus", ["setMode"]);
        system = context.getInterface("system", ["exit", "getFeatures"]);
        logger = context.getInterface("logger", ["log", "error"]);
        storage = context.getInterface("storage", ["remove"]);
        settings = context.getInterface("settings", ["get", "getAll", "update", "save"]);
        resources = context.getInterface("resources", ["get", "has"]);
        
        interpreter = context.getInterface("interpreter", [
            "hasCurrentSlot",
            "clearState",
            "isStarted",
            "start",
            "loadCurrentSlot",
            "save",
            "load",
            "getCurrentNodeId"
        ]);
        
        screens = resources.get("screens");
        confirm = createConfirm(context);
        
        // A stack for remembering which screen to return to.
        stack = [];
        
        // The curtain element is used to darken the screen when
        // transitioning from one state to the next, e.g. when
        // the section changes.
        curtain = document.createElement("div");
        
        curtain.setAttribute("class", "curtain");
        
        context.on("screen_click", onScreenClick);
        context.on("showScreen", removeInactiveElements);
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
        
        context.disconnectInterface(api);
        
        context.removeListener("screen_click", onScreenClick);
        context.removeListener("showScreen", removeInactiveElements);
        context.removeListener("change_focus_mode", onFocusModeChange);
        context.removeListener("resume_game", resumeGame);
        context.removeListener("clear_state", onClearState);
        context.removeListener("update_state", onUpdateState);
        
        logger = null;
        storage = null;
        settings = null;
        resources = null;
    }
    
    function getScreenScripts(/* screenName */) {
        return [];
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
        
        var container = context.call("ui/getScreenContainer");
        
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
            stack.push(currentScreen);
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
            
            var screenContainer = context.call("ui/getScreenContainer");
            var content = format(screen, settings.getAll());
            
            vars.set("storyTitle", story.getTitle());
            
            content = formatter("{$", "}")(content, vars.getAll());
            
            screenContainer.innerHTML = content;
            
            context.publish("showScreen", currentScreen);
            
            then();
        }
        
    }
    
    function back() {
        
        var lastScreen;
        
        if (stack.length < 1 && interpreter.isStarted()) {
            return resumeGame();
        }
        
        if (!stack.length) {
            return;
        }
        
        lastScreen = stack.pop();
        
        if (!stack.length) {
            currentScreen = undefined;
        }
        
        run(lastScreen);
    }
    
    function animateScreenEntry(inBetween, then) {
        
        var screenContainer = context.call("ui/getScreenContainer");
        
        then = then || none;
        
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            context.publish("screen_entry", currentScreen);
            
            inBetween();
            hideCurtain(function () {
                context.publish("showScreen", currentScreen);
                then();
            });
        });
    }
    
    function animateScreenExit(then) {
        
        var screenContainer = context.call("ui/getScreenContainer");
        
        showCurtain(function () {
            
            focus.setMode("node");
            
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            context.publish("screen_exit");
            
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
        
        document.body.appendChild(curtain);
        
        curtain.style.display = "";
        curtainVisible = true;
        
        setTimeout(function () {
            transform(0, 1, setOpacity(curtain), {duration: api.getScreenFadeInTime()}, then);
        }, 50);
        
    }
    
    function hideCurtain(then) {
        
        if (!curtainVisible) {
            
            if (then) {
                then();
            }
            
            return;
        }
        
        curtainVisible = false;
        
        transform(1, 0, setOpacity(curtain), {duration: api.getScreenFadeOutTime()}, function () {
            
            curtain.style.display = "none";
            
            try {
                document.body.removeChild(curtain);
            }
            catch (error) {
                logger.error(error);
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
            context.publish("screen_exit");
        }, 1000);
    }
    
    function startStory() {
        
        removeInactiveElements();
        exitScreenMode();
        interpreter.start();
        
        setTimeout(function () {
            context.publish("screen_exit");
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
    
    function exitScreenMode(then) {
        
        currentScreen = undefined;
        
        focus.setMode("node");
        clearStack();
        
        animateScreenExit(then);
    }
    
    function clearStack() {
        stack.splice(0, stack.length);
    }
    
    function setOpacity(element) {
        return function (v) {
            element.style.opacity = v;
        };
    }
    
    function getScreenFadeInTime() {
        return SCREEN_FADE_IN;
    }
    
    function getScreenFadeOutTime() {
        return SCREEN_FADE_OUT;
    }
    
    return {
        init: init,
        destroy: destroy,
        run: run,
        back: back
    };
    
}

module.exports = {
    create: create
};
