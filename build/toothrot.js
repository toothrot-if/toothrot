(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global require */

var interpreter = require("./interpreter.js");
var resources, pack, element;

element = document.querySelector("script[type=toothrot-pack]");

if (element) {
    
    pack = element.innerHTML;
    resources = JSON.parse(window.btoa(pack));
    
    interpreter.run(resources);
}
else {
    window.TOOTHROT = interpreter;
}

},{"./interpreter.js":2}],2:[function(require,module,exports){
/* global move, __line, setInterval, clearInterval */

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

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var FOCUS_MODE_NODE = "node";
var FOCUS_MODE_ACTIONS = "actions";
var FOCUS_MODE_SCREEN = "screen";
var FOCUS_MODE_MESSAGEBOX = "messagebox";

var MAX_SLOTS = 20;

var none = function () {};

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var defaultStorage = require("./storage.js");

function run (story, container, $, opt, resources) {
    
    var templates = resources.templates;
    var defaultScreens = resources.screens;
    var messageBoxTemplate = templates.confirm;
    
    var currentNode, currentSection, key, timeoutId, focusOffset, highlightCurrent;
    var currentScreen, curtainVisible = false;
    var nextClickTime = Date.now();
    var settings = {};
    var stack = [];
    var screenStack = [];
    var focusMode = FOCUS_MODE_NODE;
    var nodes = story.nodes;
    var vars = Object.create(null);
    var text = document.createElement("div");
    var indicator = document.createElement("div");
    var background = document.createElement("div");
    var curtain = document.createElement("div");
    var backgroundDimmer = document.createElement("div");
    var actionsCurtain = document.createElement("div");
    var actionsContainer = document.createElement("div");
    var optionsCurtain = document.createElement("div");
    var optionsContainer = document.createElement("div");
    var screenContainer = document.createElement("div");
    var highlighter = document.createElement("div");
    var cancelCharAnimation;
    
    opt = opt || {};
    
    var timerTemplate = opt.timerTemplate || 
        '<div class="TimerBar" style="width: {remaining}%;"></div>';
    
    var storageKey = "TE-" + story.meta.title;
    var screens = opt.screens || defaultScreens;
    var listeners = opt.on || {};
    
    var storage = typeof opt.storage === "function" ?
        opt.storage(storageKey) :
        defaultStorage(storageKey);
    
    var env = {
        get: function (key) {
            return vars[key];
        },
        set: function (key, val) {
            vars[key] = val;
        },
        has: function (key) {
            return typeof vars[key] !== "undefined";
        },
        move: move,
        link: function (label, target) {
            return insertLink(label, target);
        },
        objectLink: function (label, actions) {
            return insertObjectLink(label, undefined, undefined, actions);
        },
        dim: function (opacity, duration) {
            return move(backgroundDimmer).
                set("opacity", opacity).
                duration(arguments.length > 1 ? duration : 800).
                end(function () {
                    vars["$$dim"] = opacity;
                });
        }
    };
    
    $ = $ || {};
    
    for (key in $) {
        env[key] = $[key];
    }
    
    container.setAttribute("data-section", nodes.start.section);
    text.setAttribute("class", "Text");
    indicator.setAttribute("class", "NextIndicator");
    highlighter.setAttribute("class", "Highlighter");
    highlighter.setAttribute("data-type", "highlighter");
    background.setAttribute("class", "Background");
    backgroundDimmer.setAttribute("class", "BackgroundDimmer");
    actionsCurtain.setAttribute("class", "ActionsCurtain");
    actionsContainer.setAttribute("class", "ActionsContainer");
    optionsCurtain.setAttribute("class", "OptionsCurtain");
    optionsContainer.setAttribute("class", "OptionsContainer");
    screenContainer.setAttribute("class", "ScreenContainer");
    curtain.setAttribute("class", "Curtain");
    
    actionsCurtain.appendChild(actionsContainer);
    optionsCurtain.appendChild(optionsContainer);
    container.appendChild(background);
    container.appendChild(backgroundDimmer);
    container.appendChild(text);
    container.appendChild(screenContainer);
    document.body.appendChild(highlighter);
    
    highlighter.addEventListener("click", function (event) {
        event.stopPropagation();
        event.preventDefault();
        executeHighlighter();
    });
    
    actionsCurtain.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "action") {
            event.stopPropagation();
            event.preventDefault();
            animateActionsExit();
        }
    });
    
    optionsCurtain.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
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
                link
            );
        }
        else if (link.getAttribute("data-type") === "action") {
            animateActionsExit(runNode.bind(null, nodes[link.getAttribute("data-target")]));
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars["$$choice"] = JSON.parse(window.atob(link.getAttribute("data-value")));
            
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
                runScreen(target);
            }
            else if (target === "start") {
                exitScreenMode(function () {
                    runNode(nodes.start);
                });
            }
            else if (target === "continue") {
                exitScreenMode(function () {
                    loadCurrentSlot();
                });
            }
            else if (target === "resume") {
                resumeGame();
            }
            else if (target === "back") {
                returnToLastScreen();
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
            else if (focusMode === FOCUS_MODE_NODE) {
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
    
    loadSettings(runScreen.bind(undefined, "main"));
    
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
        
        if (typeof vars["$$dim"] === "number") {
            env.dim(vars["$$dim"], 0);
        }
        
        runNode(nodes[data.node]);
    }
    
    function reflowElements () {
        if (highlightCurrent) {
            highlightCurrent();
        }
    }
    
    function runScreen (name) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
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
            screenContainer.innerHTML = screen;
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
                    exitScreenMode(function () {
                        load(id);
                    });
                }
            });
        }
        else {
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
        
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
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
            
            node.links.forEach(function (link, i) {
                if (link.type === "direct_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertLink(link.label, link.target)
                    );
                }
                else if (link.type === "object_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertObjectLink(link.label, node.id, i)
                    );
                }
            });
            
            node.scripts.forEach(function (script, i) {
                
                var result;
                
                try {
                    result = evalScript(story, env, script.body, script.line);
                }
                catch (error) {
                    console.error("Cannot execute script at line " + script.line + ":", error);
                }
                
                if (typeof result !== "string") {
                    return;
                }
                
                content = content.replace("(%s" + i + "%)", result);
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
            
            if (
                node.options.length ||
                node.timeout ||
                node.links.length ||
                node.reveal === false
            ) {
                insertSpecials();
            }
            else {
                hideCharacters(text);
                cancelCharAnimation = revealCharacters(text, 30, insertSpecials).cancel;
            }
            
            function insertSpecials () {
                
                if (typeof node.timeout === "number") {
                    addTimer(text, node);
                }
                
                if (node.options.length) {
                    addOptions(text, node);
                }
                else if (node.next || node.returnToLast) {
                    text.appendChild(indicator);
                }
            }
            
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
        
        if (focusMode !== FOCUS_MODE_NODE) {
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
        move(actionsCurtain).set("opacity", 0).duration(0).end();
        container.appendChild(actionsCurtain);
        move(actionsCurtain).set("opacity", 1).duration(NODE_FADE_IN).end(then);
    }
    
    function animateActionsExit (then) {
        move(actionsCurtain).set("opacity", 0).duration(NODE_FADE_OUT).end(function () {
            
            focusMode === FOCUS_MODE_NODE;
            container.removeChild(actionsCurtain);
            clearActions();
            
            if (then) {
                then();
            }
        });
    }
    
    function animateScreenEntry (inBetween, then) {
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            emit("screenEntry");
            
            inBetween();
            hideCurtain(then);
        });
    }
    
    function animateScreenExit (then) {
        showCurtain(function () {
            
            focusMode = FOCUS_MODE_NODE;
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            emit("screenExit")
            
            hideCurtain(then);
        });
    }
    
    function showObjectActions (nodeId, linkId, actions, eventTarget) {
        
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
            addAction(key, link.target[key]);
        }
        
        positionBelow(actionsContainer, eventTarget);
        animateActionsEntry();
        
        emit("showActions");
    }
    
    function addAction (label, target) {
        
        var option = document.createElement("a");
        
        option.setAttribute("class", "Action");
        option.setAttribute("data-type", "action");
        option.setAttribute("data-target", target);
        
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
        
        container.appendChild(optionsCurtain);
    }
    
    function addOption (opt, node) {
        
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
            
            if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (line " + node.line + ").");
                }
                
                vars["$$choice"] = options[node.defaultOption].value;
                
                runNode(nodes[options[node.defaultOption].target]);
            }
            else if (options.length) {
                
                vars["$$choice"] = options[0].value;
                
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
    
    function insertObjectLink (label, nodeId, linkId, actions) {
        
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
        
        if (focusOffset < options.length) {
            return options[focusOffset];
        }
        else {
            return links[focusOffset];
        }
    }
    
    function countFocusableElements () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        
        return options.length + links.length;
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
    }
    
    function confirm (text, then) {
        
        var boxContainer = document.createElement("div");
        
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
                
                boxContainer.parentNode.removeChild(boxContainer);
                boxContainer.removeEventListener("click", onClick);
                
                then(value === "yes" ? true : false);
            }
        }
    }
}

function evalScript (__story, $, __body, __line) {
    
    var get = $.get;
    var set = $.set;
    var has = $.has;
    var move = $.move;
    var link = $.link;
    var dim = $.dim;
    var objectLink = $.objectLink;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    
    return eval(__body);
}

function positionBelow (element, anchorElement) {
    
    var rect;
    
    element.style.position = "absolute";
    
    element.style.right = "auto";
    element.style.bottom = "auto";
    
    rect = anchorElement.getBoundingClientRect();
    
    element.style.top = (rect.bottom + rect.height + 10) + "px";
    element.style.left = (rect.left + ((rect.right - rect.left) / 2)) + "px";
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

module.exports = {
    run: run
};


},{"./storage.js":3}],3:[function(require,module,exports){
/* global using */

//
// Module for storing the game state in local storage.
//
// Savegames look like this:
//

/*
{
    name: "fooBarBaz", // a name. will be given by the engine
    time: 012345678    // timestamp - this must be set by the storage
    data: {}           // this is what the engine gives the storage
}
*/

function storage (storageKey) {
    
    var none = function () {};
    
    storageKey = storageKey || "txe-savegames";
    
    function getItem (name) {
        return JSON.parse(localStorage.getItem(name)) || {};
    }
    
    function setItem (name, data) {
        return localStorage.setItem(name, JSON.stringify(data));
    }
    
    function save (name, data, then) {
        
        var store, error;
        
        then = then || none;
        
        try {
            
            store = getItem(storageKey);
            
            store[name] = {
                name: name,
                time: Date.now(),
                data: data
            };
            
            setItem(storageKey, store);
            
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, true);
    }
    
    function load (name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey)[name];
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function all (then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function remove (name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        delete value[name];
        
        setItem(storageKey, value);
        
        then(null, true);
    }
    
    return {
        save: save,
        load: load,
        all: all,
        remove: remove
    };
}

module.exports = storage;

},{}]},{},[1]);
