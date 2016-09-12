/* global __line, setInterval, clearInterval */

var KEY_CODE_ENTER = 13;
var KEY_CODE_ESCAPE = 27;
var KEY_CODE_SPACE = 32;
var KEY_CODE_LEFT = 37;
var KEY_CODE_UP = 38;
var KEY_CODE_RIGHT = 39;
var KEY_CODE_DOWN = 40;

var NODE_FADE_IN = 600;
var NODE_FADE_OUT = 300;
var SECTION_FADE_IN = 600;
var SECTION_FADE_OUT = 300;
var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;
var UI_FADE_IN = 200;
var UI_FADE_OUT = 200;

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var FOCUS_MODE_NODE = "node";
var FOCUS_MODE_ACTIONS = "actions";
var FOCUS_MODE_SCREEN = "screen";
var FOCUS_MODE_MESSAGEBOX = "messagebox";

var NOTIFICATION_DURATION = 3000;

var MAX_SLOTS = 20;

var none = function () {};

var move = require("move-js");
var clone = require("clone");
var merge = require("deepmerge");
var format = require("vrep").format;
var Howl = require("howler").Howl;
var objects = require("./objects.js");
var createNotification = require("./notifications.js").create;

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var defaultStorage = require("./storage.js");

var nw = (function () {
    try {
        window.require("nw.gui");
        return true;
    }
    catch (error) {
        return false;
    }
}());

var features = {
    fullscreen: hasFullscreen(),
    exit: canExit()
};

function run (resources, _, opt) {
    
    var story = resources.story;
    var container = document.createElement("div");
    
    var templates = resources.templates;
    var defaultScreens = resources.screens;
    var messageBoxTemplate = templates.confirm;
    
    var currentNode, currentSection, key, timeoutId, focusOffset, highlightCurrent;
    var currentSound, currentAmbience, currentMusic;
    var currentScreen, curtainVisible = false;
    var nextClickTime = Date.now();
    
    // General story settings. Can be changed using screens.
    var settings = {
        textSpeed: 50,
        soundVolume: 100,
        ambienceVolume: 100,
        musicVolume: 100
    };
    
    // The story's variables. Available in scripts as: $
    var vars = Object.create(null);
    
    vars._objects = objects.assembleAll(resources.objects || {});
    
    // A stack for remembering which node to return to.
    var stack = [];
    
    // A stack for remembering which screen to return to.
    var screenStack = [];
    
    // The highlighter's current focus mode.
    // Determines which elements can be highlighted.
    var focusMode = FOCUS_MODE_NODE;
    
    var nodes = story.nodes;
    var sections = story.sections;
    
    // All the different DOM elements used by the interpreter:
    
    var ui = document.createElement("div");
    var text = document.createElement("div");
    var indicator = document.createElement("div");
    var background = document.createElement("div");
    
    // The curtain element is used to darken the screen when
    // transitioning from one state to the next, e.g. when
    // the section changes.
    var curtain = document.createElement("div");
    
    // Actions and options are put into a parent element
    // so that clicks can be intercepted and to allow
    // more flexibility in styling the elements with CSS.
    var actionsParent = document.createElement("div");
    var optionsParent = document.createElement("div");
    
    // The background can be dimmed using "dim(amount)" in scripts.
    // This is the element used for this purpose:
    var backgroundDimmer = document.createElement("div");
    
    var actionsContainer = document.createElement("div");
    var optionsContainer = document.createElement("div");
    var screenContainer = document.createElement("div");
    
    // The highlighter is an absolutely positioned element
    // that can be moved over clickable elements by using
    // the arrow keys. Hitting the return key when an element
    // is highlighted will execute a click on the element.
    var highlighter = document.createElement("div");
    
    // When the "reveal" animation for text is started,
    // a function to cancel it is put in here.
    var cancelCharAnimation;
    
    opt = opt || {};
    
    // Determines how to display timers in the story.
    var timerTemplate = opt.timerTemplate || 
        '<div class="TimerBar" style="width: {remaining}%;"></div>';
    
    // Each story should have its own storage key so that
    // one story doesn't overwrite another story's savegames
    // and settings.
    var storageKey = "TOOTHROT-" + story.meta.title;
    
    // Screens can be used to implement simple connected menus.
    // Screens are written in pure HTML and can be styled with CSS.
    // When an element is clicked, the event bubbles up to the
    // screen container where it is decided whether the click means
    // anything and executes any associated actions (e.g. a click
    // on a button is supposed to update something or go to another
    // screen).
    var screens = opt.screens || defaultScreens;
    
    // External listeners can be hooked into the system
    // to allow observing the interpreter's state.
    var listeners = opt.on || {};
    
    // The storage to use. Default is the browser's localStorage.
    // But this can be set using the options to anything with the
    // same API, e.g. a server-side storage using AJAX can be
    // used instead.
    var storage = typeof opt.storage === "function" ?
        opt.storage(storageKey) :
        defaultStorage(storageKey);
    
    // The environment for scripts. It's available in scripts as: _
    var env = {
        link: function (label, target) {
            return insertLink(label, target);
        },
        objectLink: function (label, actions) {
            return insertObjectLink(label, actions);
        },
        dim: function (opacity, duration) {
            return move(backgroundDimmer).
                set("opacity", opacity).
                duration(arguments.length > 1 ? duration : 800).
                end(function () {
                    vars._dim = opacity;
                });
        },
        o: function (name) {
            return objects.create(name, objects.find(name, vars._objects), insertObjectLink);
        },
        createObject: function (name, prototypes) {
            
            vars._objects[name] = {
                prototypes: prototypes
            };
            
            vars._objects[name] = objects.assemble(name, vars._objects);
        },
        oneOf: function () {
            return arguments[Math.floor(Math.random() * arguments.length)];
        }
    };
    
    // We have internal listeners so that external listeners don't interfere
    // with core features.
    var internalListeners = {
        "updateSetting.soundVolume": function (env, volume) {
            if (currentSound) {
                currentSound.volume(volume / 100);
            }
        },
        "updateSetting.ambienceVolume": function (env, volume) {
            if (currentAmbience) {
                currentAmbience.volume(volume / 100);
            }
        },
        "updateSetting.musicVolume": function (env, volume) {
            if (currentMusic) {
                currentMusic.volume(volume / 100);
            }
        },
        "showScreen": removeInactiveScreenElements
    };
    
    var fullscreenMode = false;
    var currentSlotExists = false;
    
    var notify = createNotification(templates.notification);
    
    _ = _ || {};
    
    for (key in _) {
        env[key] = _[key];
    }
    
    // The container element always has the current section name
    // in the "data-section" attribute so that everything can be
    // styled completely differently for each section.
    container.setAttribute("data-section", nodes.start.section);
    
    container.setAttribute("class", "Toothrot");
    text.setAttribute("class", "Text");
    indicator.setAttribute("class", "NextIndicator");
    highlighter.setAttribute("class", "Highlighter");
    highlighter.setAttribute("data-type", "highlighter");
    background.setAttribute("class", "Background");
    backgroundDimmer.setAttribute("class", "BackgroundDimmer");
    actionsParent.setAttribute("class", "ActionsCurtain");
    actionsContainer.setAttribute("class", "ActionsContainer");
    optionsParent.setAttribute("class", "OptionsCurtain");
    optionsContainer.setAttribute("class", "OptionsContainer");
    screenContainer.setAttribute("class", "ScreenContainer");
    curtain.setAttribute("class", "Curtain");
    
    actionsParent.appendChild(actionsContainer);
    optionsParent.appendChild(optionsContainer);
    container.appendChild(background);
    container.appendChild(backgroundDimmer);
    container.appendChild(text);
    container.appendChild(screenContainer);
    document.body.appendChild(highlighter);
    document.body.appendChild(container);
    document.body.appendChild(ui);
    
    ui.style.opacity = "0";
    
    ui.innerHTML = format(resources.templates.ui, vars);
    
    highlighter.addEventListener("click", function (event) {
        event.stopPropagation();
        event.preventDefault();
        executeHighlighter();
    });
    
    actionsParent.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "action") {
            event.stopPropagation();
            event.preventDefault();
            animateActionsExit();
        }
    });
    
    optionsParent.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
        }
    });
    
    ui.addEventListener("click", function (event) {
        
        var target = event.target.getAttribute("data-action") ?
            event.target :
            getClickableParent(event.target);
        
        var action = target.getAttribute("data-action");
        var screen = target.getAttribute("data-screen");
        var qsSlot = target.getAttribute("data-slot-name");
        
        if (action === "openScreen") {
            runScreen(screen);
        }
        else if (action === "toggleFullscreen") {
            toggleFullscreen();
        }
        else if (action === "quickSave") {
            save("qs_" + qsSlot, function () {
                notify("Game saved in quick save slot.", "success", NOTIFICATION_DURATION);
            });
        }
        else if (action === "quickLoad") {
            hasSlot("qs_" + qsSlot, function (error, exists) {
                
                if (!exists) {
                    notify("Quick save slot is empty.", "error", NOTIFICATION_DURATION);
                    return;
                }
                
                confirm("Load quick save slot and discard progress?", function (yes) {
                    if (yes) {
                        clearState();
                        load("qs_" + qsSlot, function () {
                            notify(
                                "Game loaded from quick save slot.",
                                "success",
                                NOTIFICATION_DURATION
                            );
                        });
                    }
                });
            });
        }
    });
    
    container.addEventListener("click", function (event) {
        
        var link = event.target, parent;
        
        if (link.getAttribute("data-link-type") === "direct_link") {
            runNode(nodes[link.getAttribute("data-target")]);
        }
        else if (link.getAttribute("data-link-type") === "object_link") {
            showObjectActions(
                link.getAttribute("data-node"),
                link.getAttribute("data-id"),
                link.getAttribute("data-actions"),
                link,
                link.getAttribute("data-object-name")
            );
        }
        else if (link.getAttribute("data-type") === "action") {
            animateActionsExit(function () {
                vars._object = link.getAttribute("data-object-name");
                vars._action = link.getAttribute("data-action-name");
                runNode(nodes[link.getAttribute("data-target")]);
            });
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars._choice = JSON.parse(window.atob(link.getAttribute("data-value")));
            
            if (link.getAttribute("data-target")) {
                runNode(nodes[link.getAttribute("data-target")]);
            }
            else {
                if (!cancelCharAnimation || !cancelCharAnimation()) {
                    next();
                }
            }
        }
        else {
            
            parent = getClickableParent(event.target);
            
            if (parent && typeof parent.click === "function") {
                return parent.click();
            }
            
            if (currentNode && currentNode.options.length) {
                return;
            }
            
            if (!cancelCharAnimation || !cancelCharAnimation()) {
                next();
            }
        }
    });
    
    screenContainer.addEventListener("click", function (event) {
        
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
                            clearState();
                            runScreen(target);
                        }
                    });
                }
                else {
                    runScreen(target);
                }
            }
            else if (target === "start") {
                exitScreenMode(function () {
                    runNode(nodes.start);
                });
            }
            else if (target === "continue") {
                clearState();
                exitScreenMode(function () {
                    loadCurrentSlot();
                });
            }
            else if (target === "resume") {
                resumeGame();
            }
            else if (target === "exit") {
                confirm("Do you really want to quit?", function (yes) {
                    if (yes) {
                        exit();
                    }
                });
            }
            else if (target === "back") {
                returnToLastScreen();
            }
            else if (target === "saveSettings") {
                updateSettings(returnToLastScreen);
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
    });
    
    function exitScreenMode (inBetween, then) {
        
        currentScreen = undefined;
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        screenStack.splice(0, screenStack.length);
        
        animateScreenExit(function () {
            
            if (inBetween) {
                inBetween();
            }
        }, then);
    }
    
    window.addEventListener("keyup", function (event) {
        if (event.keyCode === KEY_CODE_RIGHT || event.keyCode === KEY_CODE_SPACE) {
            
            if (currentNode && currentNode.options.length) {
                return;
            }
            
            if (!cancelCharAnimation || !cancelCharAnimation()) {
                next();
            }
        }
        else if (event.keyCode === KEY_CODE_DOWN) {
            focusNext();
        }
        else if (event.keyCode === KEY_CODE_UP) {
            focusPrevious();
        }
        else if (event.keyCode === KEY_CODE_ESCAPE) {
            
            if (focusMode === FOCUS_MODE_ACTIONS) {
                focusMode = FOCUS_MODE_NODE;
                animateActionsExit();
            }
            else if (focusMode === FOCUS_MODE_NODE && typeof focusOffset !== "number") {
                runScreen("pause");
            }
            else if (focusMode === FOCUS_MODE_SCREEN && currentScreen !== "main") {
                returnToLastScreen();
            }
            
            if (typeof focusOffset === "number") {
                resetHighlight();
            }
        }
        else if (event.keyCode === KEY_CODE_ENTER) {
            executeHighlighter();
        }
    });
    
    function executeHighlighter () {
        
        if (typeof focusOffset === "number") {
            
            if (focusMode === FOCUS_MODE_NODE) {
                getFocusedElement().click();
            }
            else if (focusMode === FOCUS_MODE_ACTIONS) {
                getFocusedAction().click();
            }
            else if (focusMode === FOCUS_MODE_SCREEN) {
                getFocusedScreenItem().click();
            }
            else if (focusMode === FOCUS_MODE_MESSAGEBOX) {
                getFocusedBoxButton().click();
            }
            
            resetHighlight();
        }
    }
    
    window.addEventListener("resize", reflowElements);
    window.addEventListener("orientationchange", reflowElements);
    document.addEventListener("fullscreenchange", reflowElements);
    document.addEventListener("webkitfullscreenchange", reflowElements);
    document.addEventListener("mozfullscreenchange", reflowElements);
    document.addEventListener("MSFullscreenChange", reflowElements);
    
    document.title = story.meta.title || "Toothrot Engine";
    
    hasCurrentSlot(function (error, exists) {
        currentSlotExists = !error && exists;
        removeInactiveScreenElements();
        loadSettings(runScreen.bind(undefined, "main", function () {
            ui.style.opacity = "1";
        }));
    });
    
    function clearState () {
        stopAudio();
        currentNode = undefined;
        text.innerHTML = "";
        stack = [];
        emit("clearState");
    }
    
    function loadSettings (then) {
        
        then = then || none;
        
        storage.load("settings", function (error, data) {
            
            if (error) {
                return then(error);
            }
            
            if (!data) {
                storage.save("settings", settings, function () {
                    then();
                });
            }
            else {
                mergeSettings(data.data);
                then();
            }
        });
    }
    
    function mergeSettings (other) {
        for (var key in other) {
            settings[key] = other[key];
        }
    }
    
    function updateSettings (then) {
        
        var settingWidgets = screenContainer.querySelectorAll("*[data-type=setting]");
        
        [].forEach.call(settingWidgets, function (widget) {
            
            var name = widget.getAttribute("data-name");
            var value = widget.value;
            
            if (!name) {
                return;
            }
            
            settings[name] = value;
            
            emit("updateSetting." + name, value);
        });
        
        console.log("Updated settings:", settings);
        
        saveSettings(then);
    }
    
    function saveSettings (then) {
        
        then = then || none;
        
        storage.save("settings", settings, function () {
            then();
        });
    }
    
    function serialize () {
        return JSON.stringify({
            vars: vars,
            stack: stack,
            node: currentNode ? currentNode.id : "start",
            text: text.textContent
        });
    }
    
    function resume (data) {
        
        data = JSON.parse(data);
        
        stack = data.stack;
        vars = data.vars;
        
        if (typeof vars._dim === "number") {
            env.dim(vars._dim, 0);
        }
        
        if (vars._currentSound) {
            playSound(unserializeAudioPath(vars._currentSound));
        }
        
        if (vars._currentAmbience) {
            playAmbience(unserializeAudioPath(vars._currentAmbience));
        }
        
        if (vars._currentMusic) {
            playMusic(unserializeAudioPath(vars._currentMusic));
        }
        
        runNode(nodes[data.node]);
    }
    
    function reflowElements () {
        if (highlightCurrent) {
            highlightCurrent();
        }
    }
    
    function runScreen (name, then) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
        then = then || none;
        focusMode = FOCUS_MODE_SCREEN;
        resetHighlight();
        
        if (!screen) {
            throw new Error("No such screen:" + name);
        }
        
        if (currentScreen && !isSameScreen) {
            screenStack.push(currentScreen);
        }
        
        currentScreen = name;
        
        if (name === "save") {
            showSaveScreen(isSameScreen);
        }
        else {
            if (isSameScreen) {
                replaceScreen();
            }
            else {
                animateScreenEntry(replaceScreen);
            }
        }
        
        function showSaveScreen (isSameScreen) {
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
                
                function replace () {
                    replaceScreen();
                    populateSlots(all);
                }
            });
        }
        
        function replaceScreen () {
            
            screenContainer.innerHTML = format(screen, settings);
            
            emit("showScreen");
            then();
        }
        
        function getDomNodeContent (dom) {
            
            var mockParent = document.createElement("div");
            
            mockParent.appendChild(dom.cloneNode(true));
            
            return mockParent.innerHTML;
        }
        
        function populateSlots (slots) {
            
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
            
            if (!currentNode) {
                removeSaveButtons();
            }
            
            function removeSaveButtons () {
                
                var buttons = document.querySelectorAll("*[data-type=slot-button]");
                
                [].forEach.call(buttons, function (button) {
                    
                    if (button.getAttribute("data-action") !== "save") {
                        return;
                    }
                    
                    button.parentNode.removeChild(button);
                });
            }
            
            function insertVars (tpl, slot, i) {
                
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
    
    function trimText (text, length) {
        return (text.length > length ? text.substring(0, length - 3) + "..." : text);
    }
    
    function formatTime (time) {
        
        var date = new Date(time);
        
        return "" + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() +
            " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
            
        function pad (num) {
            return (num < 10 ? "0": "") + num;
        }
    }
    
    function returnToLastScreen () {
        
        var lastScreen;
        
        if (screenStack.length < 1) {
            return resumeGame();
        }
        
        lastScreen = screenStack.pop();
        
        if (!screenStack.length) {
            currentScreen = undefined;
        }
        
        runScreen(lastScreen);
    }
    
    function resumeGame () {
        animateScreenExit();
        currentScreen = undefined;
        focusMode = FOCUS_MODE_NODE;
        return;
    }
    
    function loadCurrentSlot () {
        load("current");
    }
    
    function hasCurrentSlot (then) {
        return hasSlot("current", then);
    }
    
    function hasSlot (name, then) {
        storage.load(name, function (error, data) {
            then(error, !!data);
        });
    }
    
    function load (name, then) {
        
        then = then || none;
        
        storage.load(name, function (error, data) {
            
            if (error) {
                return;
            }
            
            resume(data.data);
            then();
        });
    }
    
    function save (name, then) {
        
        then = then || none;
        
        storage.save(name, serialize(), function (error) {
            
            if (error) {
                return;
            }
            
            then();
        });
    }
    
    function saveSlot (element) {
        
        var id = element.getAttribute("data-slot-id");
        var isEmpty = !!element.getAttribute("data-is-empty");
        
        if (isEmpty) {
            save(id, function () {
                console.log("Saved in slot:", id);
                runScreen("save");
            });
        }
        else {
            confirm("Overwrite slot?", function (yes) {
                if (yes) {
                    save(id, function () {
                        console.log("Saved in slot:", id);
                        runScreen("save");
                    });
                }
            });
        }
    }
    
    function loadSlot (element) {
        
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
    
    function deleteSlot (element) {
        
        var id = element.getAttribute("data-slot-id");
        
        confirm("Really delete slot?", function (yes) {
            if (yes) {
                storage.remove(id);
                runScreen("save");
            }
        });
    }
    
    function runNode (node, nextType) {
        
        var content = node.content;
        var copy = merge(clone(sections[node.section]), clone(node));
        var skipTo;
        
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
        }
        
        env.skipTo = function (id) {
            skipTo = id;
        };
        
        env.node = function () {
            return copy;
        };
        
        env.addOption = function (label, target, value) {
            copy.options.push({
                type: "option",
                value: value || "",
                line: 0,
                label: "" + label,
                target: "" + (target || "")
            });
        };
        
        copy.scripts.forEach(function (script, i) {
            
            var result;
            
            try {
                result = evalScript(story, env, vars, script.body, script.line);
            }
            catch (error) {
                console.error("Cannot execute script at line " + script.line + ":", error);
            }
            
            content = content.replace("(%s" + i + "%)", result);
        });
        
        if (skipTo) {
            return runNode(nodes[skipTo]);
        }
        
        if (currentNode && !node.parent && nextType !== "return") {
            
            if (stack.indexOf(currentNode.id) >= 0) {
                stack.splice(0, stack.length);
            }
            
            stack.push(currentNode.id);
        }
        
        if (!currentNode) {
            replaceContent();
        }
        else if (node.section !== currentSection) {
            animateSectionTransition();
        }
        else {
            animateNodeTransition();
        }
        
        function animateNodeTransition () {
            animateNodeExit(function () {
                replaceContent();
                setTimeout(function () {
                    animateNodeEntry();
                }, 50);
            });
        }
        
        function animateSectionTransition () {
            animateNodeExit(function () {
                animateSectionExit(function () {
                    container.setAttribute("data-section", node.section);
                    animateSectionEntry(function () {
                        replaceContent();
                        setTimeout(function () {
                            animateNodeEntry();
                        }, 50);
                    });
                });
            });
        }
        
        function replaceContent () {
            
            currentNode = node;
            currentSection = node.section;
            
            container.setAttribute("data-node-id", currentNode.id);
            container.setAttribute("data-section", currentNode.section);
            
            copy.links.forEach(function (link, i) {
                if (link.type === "direct_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertLink(link.label, link.target)
                    );
                }
                else if (link.type === "object_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertObjectLink(link.label, undefined, node.id, i)
                    );
                }
            });
            
            content = content.replace(/\(\$((.|\n)*?)\$\)/g, function (match, p1, p2) {
                
                var key = p1.trim();
                
                if (typeof vars[key] !== "undefined") {
                    return vars[key];
                }
                
                console.warn("Undefined variable in node '" + node.id +
                    "' (line " + node.line + "): " + key);
                
                return "";
            });
            
            content = (function () {
                
                var mockParent = document.createElement("div");
                
                mockParent.innerHTML = content;
                
                markCharacters(mockParent);
                
                return mockParent.innerHTML;
            }());
            
            text.innerHTML = content;
            
            if (copy.audio === false) {
                stopAudio();
            }
            
            if (copy.sound) {
                playSound(copy.sound);
            }
            else {
                stopSound();
            }
            
            if (copy.ambience) {
                playAmbience(copy.ambience);
            }
            else if (copy.ambience === false) {
                stopAmbience();
            }
            
            if (copy.music) {
                playMusic(copy.music);
            }
            else if (copy.music === false) {
                stopMusic();
            }
            
            if (
                copy.options.length ||
                copy.timeout ||
                copy.links.length ||
                copy.reveal === false ||
                settings.textSpeed >= 100
            ) {
                insertSpecials();
            }
            else {
                hideCharacters(text);
                cancelCharAnimation = revealCharacters(
                    text,
                    (settings.textSpeed / 100) * 60,
                    insertSpecials
                ).cancel;
            }
            
            function insertSpecials () {
                
                if (typeof copy.timeout === "number") {
                    addTimer(text, copy);
                }
                
                if (copy.options.length) {
                    addOptions(text, copy);
                }
                else if (copy.next || copy.returnToLast) {
                    text.appendChild(indicator);
                }
            }
            
            currentSlotExists = true;
            storage.save("current", serialize());
            
        }
    }
    
    function revealCharacters (element, speed, then) {
        
        var chars = element.querySelectorAll(".Char");
        var offset = 1000 / (speed || 40);
        var stop = false;
        var timeouts = [];
        var left = chars.length;
        
        then = then || function () {};
        
        [].forEach.call(chars, function (char, i) {
            
            var id = setTimeout(function () {
                
                if (stop) {
                    return;
                }
                
                move(char).set("opacity", 1).duration(10 * offset).end(function () {
                    
                    left -= 1;
                    
                    if (stop) {
                        return;
                    }
                    
                    if (left <= 0) {
                        then();
                    }
                    
                });
                
            }, i * offset);
            
            timeouts.push(id);
        });
        
        function cancel () {
            
            if (stop || left <= 0) {
                return false;
            }
            
            stop = true;
            
            timeouts.forEach(function (id) {
                clearTimeout(id);
            });
            
            [].forEach.call(chars, function (char) {
                char.style.opacity = "1";
            });
            
            then();
            
            return true;
        }
        
        return {
            cancel: cancel
        };
    }
    
    function hideCharacters (element) {
        
        var chars = element.querySelectorAll(".Char");
        
        [].forEach.call(chars, function (char) {
            char.style.opacity = 0;
        });
    }
    
    function markCharacters (element, offset) {
        
        var TEXT_NODE = 3;
        var ELEMENT = 1;
        
        offset = offset || 0;
        
        [].forEach.call(element.childNodes, function (child) {
            
            var text = "", newNode;
            
            if (child.nodeType === TEXT_NODE) {
                
                [].forEach.call(child.textContent, function (char) {
                    text += '<span class="Char" data-char="' + offset + '">' + char + '</span>';
                    offset += 1;
                });
                
                newNode = document.createElement("span");
                
                newNode.setAttribute("class", "CharContainer");
                
                newNode.innerHTML = text;
                
                child.parentNode.replaceChild(newNode, child);
            }
            else if (child.nodeType === ELEMENT) {
                offset = markCharacters(child, offset);
            }
        });
        
        return offset;
    }
    
    window.markCharacters = markCharacters;
    
    function next () {
        
        if (focusMode !== FOCUS_MODE_NODE || !currentNode) {
            return;
        }
        
        if (currentNode.next) {
            runNode(nodes[currentNode.next], "next");
            nextClickTime = Date.now();
        }
        else if (currentNode.returnToLast && nextClickWaitTimeReached()) {
            runNode(nodes[stack.pop()], "return");
            nextClickTime = Date.now();
        }
        
    }
    
    function nextClickWaitTimeReached () {
        return Date.now() - nextClickTime > NEXT_RETURN_WAIT;
    }
    
    function showCurtain (then) {
        
        if (curtainVisible) {
            return then();
        }
        
        container.appendChild(curtain);
        curtain.style.display = "";
        curtainVisible = true;
        
        setTimeout(function () {
            move(curtain).set("opacity", 1).duration(SCREEN_FADE_IN).end(then);
        }, 50);
        
    }
    
    function hideCurtain (then) {
        
        if (!curtainVisible) {
            return then();
        }
        
        curtainVisible = false;
        
        move(curtain).set("opacity", 0).duration(SCREEN_FADE_OUT).end(function () {
            
            curtain.style.display = "none";
            container.removeChild(curtain);
            
            if (then) {
                then();
            }
        });
    }
    
    function animateSectionExit (then) {
        move(container).set("opacity", 0).duration(SECTION_FADE_OUT).end(then);
    }
    
    function animateSectionEntry (then) {
        move(container).set("opacity", 1).duration(SECTION_FADE_IN).end(then);
    }
    
    function animateNodeExit (then) {
        move(text).set("opacity", 0).duration(NODE_FADE_OUT).end(then);
    }
    
    function animateNodeEntry (then) {
        move(text).set("opacity", 1).duration(NODE_FADE_IN).end(then);
    }
    
    function animateActionsEntry (then) {
        actionsParent.style.opacity = "0";
        container.appendChild(actionsParent);
        move(actionsParent).set("opacity", 1).duration(NODE_FADE_IN).end(then);
    }
    
    function animateActionsExit (then) {
        move(actionsParent).set("opacity", 0).duration(NODE_FADE_OUT).end(function () {
            
            focusMode = FOCUS_MODE_NODE;
            container.removeChild(actionsParent);
            clearActions();
            
            if (then) {
                then();
            }
        });
    }
    
    function animateScreenEntry (inBetween, then) {
        
        then = then || none;
        
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            emit("screenEntry");
            
            inBetween();
            hideCurtain(function () {
                emit("showScreen");
                then();
            });
        });
    }
    
    function animateScreenExit (then) {
        showCurtain(function () {
            
            focusMode = FOCUS_MODE_NODE;
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            emit("screenExit");
            
            hideCurtain(then);
        });
    }
    
    function showObjectActions (nodeId, linkId, actions, eventTarget, objectName) {
        
        var node, link, key;
        
        focusMode = FOCUS_MODE_ACTIONS;
        resetHighlight();
        
        if (linkId) {
            node = nodes[nodeId];
            link = node.links[linkId];
        }
        else if (actions) {
            
            link = {};
            
            try {
                link.target = JSON.parse(window.atob(actions));
            }
            catch (error) {
                throw new Error(
                    "Cannot parse object actions: " + error.message + "; actions: " + actions
                );
            }
        }
        else {
            throw new Error("Object link has neither an ID nor actions.");
        }
        
        for (key in link.target) {
            addAction(key, link.target[key], objectName);
        }
        
        animateActionsEntry();
        
        emit("showActions");
    }
    
    function addAction (label, target, objectName) {
        
        var option = document.createElement("a");
        
        option.setAttribute("class", "Action");
        option.setAttribute("data-type", "action");
        option.setAttribute("data-target", target);
        option.setAttribute("data-action-name", label);
        
        if (objectName) {
            option.setAttribute("data-object-name", objectName);
        }
        
        option.innerHTML = label;
        
        actionsContainer.appendChild(option);
    }
    
    function clearActions () {
        actionsContainer.innerHTML = "";
    }
    
    function addOptions (container, node) {
        
        optionsContainer.innerHTML = "";
        
        node.options.forEach(function (option) {
            addOption(option, node);
        });
        
        container.appendChild(optionsParent);
    }
    
    function addOption (opt) {
        
        var option = document.createElement("span");
        
        option.setAttribute("class", "Option");
        option.setAttribute("data-type", "option");
        option.setAttribute("data-target", opt.target);
        option.setAttribute("data-value", window.btoa(JSON.stringify(opt.value)));
        
        option.innerHTML = opt.label;
        
        optionsContainer.appendChild(option);
    }
    
    function addTimer (text, node) {
        
        var timeout = node.timeout;
        var start = Date.now();
        var timeoutContainer = document.createElement("div");
        
        timeoutContainer.setAttribute("class", "TimeoutContainer");
        timeoutContainer.setAttribute("data-type", "timeout");
        timeoutContainer.setAttribute("data-remaining", "100");
        timeoutContainer.setAttribute("data-progress", "0");
        
        updateTimer(100);
        emit("timerStart", timeout);
        
        text.appendChild(timeoutContainer);
        
        function updateTimer (percentage) {
            
            var remaining = 100 - percentage;
            var content = timerTemplate.replace(/{progress}/g, "" + percentage);
            
            content = content.replace(/{remaining}/g, "" + remaining);
            
            timeoutContainer.innerHTML = content;
        }
        
        timeoutId = setInterval(function () {
            
            var time = Date.now() - start;
            var percentage = Math.round(time / (timeout / 100));
            var options = node.options;
            
            if (percentage >= 100) {
                percentage = 100;
                updateTimer(percentage);
                clearInterval(timeoutId);
                timeoutId = undefined;
            }
            else {
                updateTimer(percentage);
                return;
            }
            
            emit("timerEnd");
            resetHighlight();
            
            if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (line " + node.line + ").");
                }
                
                vars._choice = options[node.defaultOption].value;
                
                runNode(nodes[options[node.defaultOption].target]);
            }
            else if (options.length) {
                
                vars._choice = options[0].value;
                
                runNode(nodes[options[0].target]);
            }
            else {
                next();
            }
        }, 50);
    }
    
    function insertLink (label, target) {
        
        if (!nodes[target]) {
            throw new Error(
                "Unknown node referenced in link '" + label + "': " + target + " @" + __line
            );
        }
        
        return '<span class="link direct_link" data-target="' + target +
            '" data-type="link" data-link-type="direct_link">' +
            label + '</span>';
    }
    
    function insertObjectLink (label, actions, nodeId, linkId, objectName) {
        
        var key, html;
        
        html = '<span class="link object_link" data-type="link" ' + 
            'data-link-type="object_link"';
        
        if (typeof nodeId !== "undefined" && typeof linkId !== "undefined") {
            html += ' data-node="' + nodeId + '" data-id="' + linkId + '"';
        }
        else if (actions) {
            
            for (key in actions) {
                if (!nodes[actions[key]]) {
                    throw new Error("Unknown node referenced in object link: " +
                        actions[key] + " @" + __line);
                }
            }
            
            html += ' data-actions="' + window.btoa(JSON.stringify(actions)) + '"';
        }
        else {
            throw new Error("Object link without ID or actions.");
        }
        
        if (objectName) {
            html += ' data-object-name="' + objectName + '"';
        }
        
        html += '>' + label + '</span>';
        
        return html;
    }
    
    function highlight (element) {
        
        var left, top, width, height;
        var padding = 1;
        var targetRect = element.getBoundingClientRect();
        
        highlightCurrent = highlight.bind(undefined, element);
        
        left = targetRect.left - padding;
        top = targetRect.top - padding;
        width = targetRect.width + (2 * padding);
        height = targetRect.height + (2 * padding);
        
        emit("focusChange", element);
        
        move(highlighter).
            x(left).
            y(top).
            set("width", width + "px").
            set("height", height + "px").
            set("opacity", 1).
            duration(200).
            ease("out").
            end();
    }
    
    function resetHighlight () {
        focusOffset = undefined;
        highlightCurrent = undefined;
        move(highlighter).
            set("opacity", 0).
            set("width", "0").
            set("height", "0").
            x(0).
            y(0).
            duration(200).
            end();
    }
    
    function focusPrevious () {
        if (focusMode === FOCUS_MODE_NODE && countFocusableElements()) {
            focusPreviousDefault();
        }
        else if (focusMode === FOCUS_MODE_ACTIONS && countFocusableActions()) {
            focusPreviousAction();
        }
        else if (focusMode === FOCUS_MODE_SCREEN && countFocusableScreenItems()) {
            focusPreviousScreenItem();
        }
        else if (focusMode === FOCUS_MODE_MESSAGEBOX && countFocusableBoxButtons()) {
            focusPreviousBoxButton();
        }
    }
    
    function focusNext () {
        if (focusMode === FOCUS_MODE_NODE && countFocusableElements()) {
            focusNextDefault();
        }
        else if (focusMode === FOCUS_MODE_ACTIONS && countFocusableActions()) {
            focusNextAction();
        }
        else if (focusMode === FOCUS_MODE_SCREEN && countFocusableScreenItems()) {
            focusNextScreenItem();
        }
        else if (focusMode === FOCUS_MODE_MESSAGEBOX && countFocusableBoxButtons()) {
            focusNextBoxButton();
        }
    }
    
    function getFocusedElement () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        var buttons = document.querySelectorAll("[data-type=button]");
        
        if (focusOffset < options.length) {
            return options[focusOffset];
        }
        else if (focusOffset < options.length + links.length) {
            return links[focusOffset - options.length];
        }
        else {
            return buttons[focusOffset - options.length - links.length];
        }
    }
    
    function countFocusableElements () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        var buttons = document.querySelectorAll("[data-type=button]");
        
        return options.length + links.length + buttons.length;
    }
    
    function getFocusedAction () {
        return document.querySelectorAll("[data-type=action]")[focusOffset];
    }
    
    function getFocusedScreenItem () {
        return screenContainer.querySelectorAll("[data-type=menu-item]")[focusOffset];
    }
    
    function getFocusedBoxButton () {
        return container.querySelectorAll("[data-type=messagebox-button]")[focusOffset];
    }
    
    function countFocusableScreenItems () {
        return screenContainer.querySelectorAll("[data-type=menu-item]").length;
    }
    
    function countFocusableActions () {
        return document.querySelectorAll("[data-type=action]").length;
    }
    
    function countFocusableBoxButtons () {
        return document.querySelectorAll("[data-type=messagebox-button]").length;
    }
    
    function focusNextDefault () {
        focusNextThing(getFocusedElement, countFocusableElements);
    }
    
    function focusNextAction () {
        focusNextThing(getFocusedAction, countFocusableActions);
    }
    
    function focusNextScreenItem () {
        focusNextThing(getFocusedScreenItem, countFocusableScreenItems);
    }
    
    function focusNextBoxButton () {
        focusNextThing(getFocusedBoxButton, countFocusableBoxButtons);
    }
    
    function focusNextThing (get, count) {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = -1;
        }
        
        focusOffset += 1;
        
        if (focusOffset > count() - 1) {
            focusOffset = 0;
        }
        
        element = get();
        emit("focusNext", element);
        
        highlight(element);
    }
    
    function focusPreviousDefault () {
        focusPreviousThing(getFocusedElement, countFocusableElements);
    }
    
    function focusPreviousAction () {
        focusPreviousThing(getFocusedAction, countFocusableActions);
    }
    
    function focusPreviousScreenItem () {
        focusPreviousThing(getFocusedScreenItem, countFocusableScreenItems);
    }
    
    function focusPreviousBoxButton () {
        focusPreviousThing(getFocusedBoxButton, countFocusableBoxButtons);
    }
    
    function focusPreviousThing (get, count) {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = 0;
        }
        
        focusOffset -= 1;
        
        if (focusOffset < 0) {
            focusOffset = count() - 1;
        }
        
        element = get();
        emit("focusPrevious", element);
        
        highlight(element);
    }
    
    function emit (channel, data) {
        
        if (typeof listeners[channel] === "function") {
            listeners[channel]({
                env: env,
                vars: vars,
                stack: stack
            }, data);
        }
        
        if (typeof internalListeners[channel] === "function") {
            internalListeners[channel]({
                env: env,
                vars: vars,
                stack: stack
            }, data);
        }
    }
    
    function confirm (text, then) {
        
        var boxContainer = document.createElement("div");
        var oldFocus = focusMode;
        
        focusMode = FOCUS_MODE_MESSAGEBOX;
        resetHighlight();
        
        boxContainer.setAttribute("class", "MessageBoxContainer");
        
        boxContainer.innerHTML = messageBoxTemplate.replace("{message}", text);
        
        boxContainer.addEventListener("click", onClick);
        container.appendChild(boxContainer);
        
        boxContainer.focus();
        
        function onClick (event) {
            
            var type = event.target.getAttribute("data-type");
            var value = event.target.getAttribute("data-value");
            
            if (type === "messagebox-button") {
                
                focusMode = oldFocus;
                boxContainer.parentNode.removeChild(boxContainer);
                boxContainer.removeEventListener("click", onClick);
                
                then(value === "yes" ? true : false);
            }
        }
    }
    
    function stopAudio () {
        stopSound();
        stopAmbience();
        stopMusic();
    }
    
    function stopSound () {
        
        if (currentSound) {
            currentSound.unload();
        }
        
        vars._currentSound = undefined;
        currentSound = undefined;
    }
    
    function stopAmbience () {
        
        if (currentAmbience) {
            currentAmbience.unload();
        }
        
        vars._currentAmbience = undefined;
        currentAmbience = undefined;
    }
    
    function stopMusic () {
        
        if (currentMusic) {
            currentMusic.unload();
        }
        
        vars._currentMusic = undefined;
        currentMusic = undefined;
    }
    
    function playSound (path) {
        vars._currentSound = serializeAudioPath(path);
        currentSound = playTrack(path, settings.soundVolume, false, currentSound);
    }
    
    function playAmbience (path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentAmbience && vars._currentAmbience === serialized) {
            return;
        }
        
        vars._currentAmbience = serialized;
        currentAmbience = playTrack(path, settings.ambienceVolume, true, currentAmbience);
    }
    
    function playMusic (path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentMusic && vars._currentMusic === serialized) {
            return;
        }
        
        vars._currentMusic = serialized;
        currentMusic = playTrack(path, settings.musicVolume, true, currentMusic);
    }
    
    function playTrack (path, volume, loop, current) {
        
        var paths = getAudioPaths(path), audio;
        
        audio = new Howl({
            urls: paths,
            volume: volume / 100,
            loop: loop === true ? true : false
        });
        
        if (current) {
            current.unload();
        }
        
        audio.play();
        
        return audio;
    }
    
    function getAudioPaths (path) {
        
        var paths = [], base;
        
        if (Array.isArray(path)) {
            
            path = path.slice();
            base = path.shift();
            
            path.forEach(function (type) {
                paths.push(base + "." + type);
            });
        }
        else {
            paths.push(path);
        }
        
        return paths;
    }
    
    function serializeAudioPath (path) {
        return JSON.stringify(path);
    }
    
    function unserializeAudioPath (path) {
        return JSON.parse(path);
    }
    
    function toggleFullscreen () {
        
        if (fullscreenEnabled() || (nw && fullscreenMode)) {
            exitFullscreen();
        }
        else {
            fullscreen();
        }
        
        resetHighlight();
        reflowElements();
    }
    
    function fullscreenEnabled () {
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    
    function fullscreen () {
        
        fullscreenMode = true;
        
        if (nw) {
            nwEnterFullscreen();
        }
        else {
            requestFullscreen(document.body);
        }
    }
    
    function exitFullscreen () {
        
        fullscreenMode = false;
        
        if (nw) {
            nwExitFullscreen();
        }
        else {
            exitBrowserFullscreen();
        }
    }
    
    function nwEnterFullscreen () {
        window.require('nw.gui').Window.get().enterKioskMode();
    }
    
    function nwExitFullscreen () {
        window.require('nw.gui').Window.get().leaveKioskMode();
    }
    
    function exitBrowserFullscreen () {
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
    
    function requestFullscreen (element) {
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
    
    function removeInactiveScreenElements () {
        removeFeatureElements();
        removeContinueButton();
    }
    
    function removeFeatureElements () {
        for (var feature in features) {
            if (!features[feature]) {
                removeElementsForFeature(feature);
            }
        }
    }
    
    function removeContinueButton () {
        
        var buttons;
        
        if (currentSlotExists) {
            return;
        }
        
        buttons = document.querySelectorAll("*[data-target=continue]");
        
        [].forEach.call(buttons || [], function (button) {
            button.parentNode.removeChild(button);
        });
    }
    
    function removeElementsForFeature (feature) {
        
        var elements = document.querySelectorAll("*[data-feature=" + feature + "]") || [];
        
        [].forEach.call(elements, function (element) {
            element.parentNode.removeChild(element);
        });
    }
}

function hasFullscreen () {
    return !!nw;
}

function canExit () {
    return !!nw;
}

function evalScript (__story, _, $, __body, __line) {
    
    var link = _.link;
    var dim = _.dim;
    var objectLink = _.objectLink;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    
    return eval(__body);
}

function getStylePropertyValue (element, property) {
    return window.getComputedStyle(element, null).getPropertyValue(property);
}

function getClickableParent (node) {
    
    var ELEMENT = 1;
    
    while (node.parentNode) {
        
        node = node.parentNode;
        
        if (node.nodeType === ELEMENT && node.getAttribute("data-type")) {
            return node;
        }
    }
}

function exit () {
    try {
        var gui = window.require("nw.gui");
        gui.App.quit();
    }
    catch (error) {
        console.error("Cannot exit: " + error);
    }
}

module.exports = {
    run: run
};

