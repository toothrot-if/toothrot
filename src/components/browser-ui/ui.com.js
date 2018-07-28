/* global __line */

var format = require("vrep").format;
var classList = require("class-manipulator").list;
var scrolling = require("../../utils/browser/scrolling.js");
var revealText = require("../../utils/browser/revealText.js");
var getClickableParent = require("../../utils/browser/getClickableParent");
var createNotification = require("../../utils/browser/notifications.js").create;
var createConfirm = require("../../utils/browser/confirm.js");

var KEY_CODE_ENTER = 13;
var KEY_CODE_ESCAPE = 27;
var KEY_CODE_SPACE = 32;
var KEY_CODE_UP = 38;
var KEY_CODE_RIGHT = 39;
var KEY_CODE_DOWN = 40;

var NOTIFICATION_DURATION = 3000;

function create(context) {
    
    var ui, text, autonextIndicator, nextIndicator, returnIndicator, indicatorHint;
    var container, screenContainer, templates, currentNode, currentSection, resources;
    var charAnimation, notify, timerTemplate, story, vars, interpreter, screens, highlighter;
    var system, settings, env, focus, confirm, nodes, bg1, bg2, bg3, indicatorHintTimeout;
    
    var api = context.createInterface("ui", {
        nodeHasControls: nodeHasControls,
        getStageContainer: getStageContainer,
        getScreenContainer: getScreenContainer,
        insertNodeControls: insertNodeControls
    });
    
    function init() {
        
        context.connectInterface(api);
        
        nodes = context.getInterface("nodes", ["get"]);
        screens = context.getInterface("uiScreens", ["run", "back"]);
        
        highlighter = context.getInterface("highlighter", ["reset"]);
        
        env = context.getInterface("env", ["set"]);
        vars = context.getInterface("vars", ["set", "getAll", "get", "has"]);
        story = context.getInterface("story", ["getTitle", "getNode", "hasNode"]);
        system = context.getInterface("system", ["toggleFullscreen"]);
        settings = context.getInterface("settings", ["get"]);
        resources = context.getInterface("resources", ["get", "has"]);
        
        focus = context.getInterface("focus", [
            "setMode",
            "next",
            "previous",
            "getMode",
            "getElementInFocus",
            "execute"
        ]);
        
        interpreter = context.getInterface("interpreter", [
            "hasCurrentSlot",
            "clearState",
            "isStarted",
            "start",
            "loadCurrentSlot",
            "save",
            "load",
            "getCurrentNodeId",
            "next",
            "runNodeById",
            "saveQuick",
            "hasQuickSlot",
            "loadQuick"
        ]);
        
        templates = resources.get("templates");
        notify = createNotification(templates.notification);
        confirm = createConfirm(context);
        
        timerTemplate = '<div class="timer-bar" style="width: {remaining}%;"></div>';
        
        bg1 = document.createElement("div");
        bg2 = document.createElement("div");
        bg3 = document.createElement("div");
        container = document.createElement("div");
        
        ui = document.createElement("div");
        text = document.createElement("div");
        
        [bg1, bg2, bg3, ui, container].forEach(function (element) {
            element.style.display = "none";
        });
        
        setTimeout(function () {
            [bg1, bg2, bg3, container].forEach(function (element) {
                element.style.display = "";
            });
        }, 1000);
        
        screenContainer = document.createElement("div");
        
        // The container element always has the current section name
        // in the "data-section" attribute so that everything can be
        // styled completely differently for each section.
        container.setAttribute("data-section", story.getNode("start").section);
        
        container.setAttribute("class", "toothrot");
        
        bg1.setAttribute("class", "toothrot-bg1");
        bg2.setAttribute("class", "toothrot-bg2");
        bg3.setAttribute("class", "toothrot-bg3");
        
        text.setAttribute("class", "text");
        text.setAttribute("aria-live", "polite");
        text.setAttribute("aria-atomic", "true");
        text.setAttribute("aria-relevant", "text");
        text.setAttribute("role", "main");
        
        screenContainer.setAttribute("class", "screen-container");
        
        container.appendChild(text);
        document.body.appendChild(screenContainer);
        document.body.appendChild(bg1);
        document.body.appendChild(bg2);
        document.body.appendChild(bg3);
        document.body.appendChild(container);
        document.body.appendChild(ui);
        
        ui.innerHTML = format(templates.ui, vars.getAll());
        
        ui.setAttribute("role", "navigation");
        
        autonextIndicator = ui.querySelector(".autonext-indicator");
        nextIndicator = ui.querySelector(".next-indicator");
        returnIndicator = ui.querySelector(".return-indicator");
        indicatorHint = ui.querySelector(".indicator-hint");
        
        ui.querySelector(".indicators").addEventListener("click", onContainerClick);
        
        autonextIndicator.setAttribute("title", "Click or press space to continue");
        autonextIndicator.setAttribute("tabindex", "1");
        nextIndicator.setAttribute("title", "Click or press space to continue");
        nextIndicator.setAttribute("tabindex", "1");
        returnIndicator.setAttribute("title", "Click or press space to return");
        returnIndicator.setAttribute("tabindex", "1");
        
        scrolling.hideScrollbar(text);
        
        ui.addEventListener("click", onUiClick);
        bg3.addEventListener("click", onContainerClick);
        container.addEventListener("click", onContainerClick);
        screenContainer.addEventListener("click", context.publish.bind(context, "screen_click"));
        window.addEventListener("keyup", onKeyUp);
        
        window.addEventListener("resize", reflowElements);
        window.addEventListener("orientationchange", reflowElements);
        document.addEventListener("fullscreenchange", reflowElements);
        document.addEventListener("webkitfullscreenchange", reflowElements);
        document.addEventListener("mozfullscreenchange", reflowElements);
        document.addEventListener("MSFullscreenChange", reflowElements);
        
        context.on("fullscreen_change", reflowElements);
        context.on("screen_entry", hideGameElements);
        context.on("screen_exit", showGameElements);
        context.on("clear_state", onClearState);
        context.on("run_node", onNodeChange);
        context.on("start", onStart);
        
        env.set("link", insertLink);
        env.set("linkify", linkify);
        
        window.addEventListener("keydown", function (event) {
            if (event.keyCode === KEY_CODE_UP || event.keyCode === KEY_CODE_DOWN) {
                event.preventDefault();
            }
        });
        
        document.title = story.getTitle();
        
        scrolling.scrollToBottom(text);
    }
    
    function destroy() {
        
        context.disconnectInterface(api);
        
        api = null;
        resources = null;
    }
    
    function getStageContainer() {
        return container;
    }
    
    function getScreenContainer() {
        return screenContainer;
    }
    
    function onStart() {
        ui.style.opacity = "1";
    }
    
    function onKeyUp(event) {
        
        var keyCode = event.keyCode;
        
        setTimeout(function () {
            handleKeyCode(keyCode);
        }, 10);
    }
    
    function handleKeyCode(keyCode) {
        
        if (keyCode === KEY_CODE_RIGHT || keyCode === KEY_CODE_SPACE) {
            if (!charAnimation || !charAnimation.cancel()) {
                interpreter.next();
            }
        }
        else if (keyCode === KEY_CODE_DOWN) {
            focus.next();
        }
        else if (keyCode === KEY_CODE_UP) {
            focus.previous();
        }
        else if (keyCode === KEY_CODE_ESCAPE) {
            
            if (focus.getMode() === "node" && !focus.getElementInFocus()) {
                screens.run("pause");
            }
            else if (focus.getMode() === "screen") {
                screens.back();
            }
            
            if (focus.getElementInFocus()) {
                highlighter.reset();
            }
        }
        else if (keyCode === KEY_CODE_ENTER) {
            focus.execute();
        }
    }
    
    function onClearState() {
        currentNode = undefined;
        text.innerHTML = "";
        container.setAttribute("data-section", story.getNode("start").section);
    }
    
    function setBg(bg) {
        
        if (bg3.getAttribute("data-current-bg") === bg) {
            return;
        }
        
        if (bg1.getAttribute("data-used")) {
            bg2.style.background = bg;
            bg2.style.opacity = 1;
            bg1.style.opacity = 0;
            bg1.removeAttribute("data-used");
            bg2.setAttribute("data-used", "true");
        }
        else {
            bg1.style.background = bg;
            bg1.style.opacity = 1;
            bg2.style.opacity = 0;
            bg2.removeAttribute("data-used");
            bg1.setAttribute("data-used", "true");
        }
        
        bg3.setAttribute("data-current-bg", bg);
        vars.set("__current_bg", bg);
    }
    
    function onNodeChange(node) {
        
        env.set("notify", notify);
        
        if (!currentNode) {
            replaceContent();
        }
        else if (node.section !== currentSection) {
            animateSectionTransition();
        }
        else {
            animateNodeTransition();
        }
        
        function animateNodeTransition() {
            animateNodeExit(function () {
                replaceContent();
                setTimeout(function () {
                    animateNodeEntry();
                }, 50);
            });
        }
        
        function animateSectionTransition() {
            animateNodeExit(function () {
                animateSectionExit(function () {
                    context.publish("section_change", node.section);
                    animateSectionEntry(function () {
                        replaceContent();
                        setTimeout(function () {
                            animateNodeEntry();
                        }, 50);
                    });
                });
            });
        }
        
        function replaceContent() {
            
            var bg;
            var content = node.content;
            var data = nodes.get(node.id);
            
            updateUi();
            
            currentNode = node;
            currentSection = node.section;
            
            container.setAttribute("data-node-id", currentNode.id);
            container.setAttribute("data-section", currentNode.section);
            
            if (data.has("background") || node.data.background) {
                bg = data.get("background") || node.data.background;
            }
            else {
                bg = vars.get("__current_bg");
            }
            
            setBg(bg);
            
            node.links.forEach(function (link, i) {
                if (link.type === "direct_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertLink(link.label, link.target)
                    );
                }
            });
            
            content = content.replace(/\(\$((.|\n)*?)\$\)/g, function (match, p1) {
                
                var key = p1.trim();
                
                if (vars.has(key)) {
                    return "" + vars.get(key);
                }
                
                console.warn("Undefined variable in node '" + node.id +
                    "' (<" + node.file + ">@" + node.line + "): " + key);
                
                return "";
            });
            
            content += node.items.map(function (item) {
                
                var description = item.text;
                
                if (!description) {
                    return "";
                }
                
                description = linkify(description, item.id);
                
                return '<p class="item-description">' + description + '</p>';
                
            }).join("");
            
            node.events.forEach(function (event) {
                
                if (event && typeof event === "object") {
                    event = event.text;
                }
                
                if (!event) {
                    return;
                }
                
                content += '<p class="event">' + event + '</p>';
                
            });
            
            content = (function () {
                
                var mockParent = document.createElement("div");
                
                mockParent.innerHTML = content;
                
                return mockParent.innerHTML;
            }());
            
            disarmOldTextItems();
            
            text.innerHTML += '<div class="separator"></div>';
            text.innerHTML += '<div class="text-item current">' + content + "</div>";
            
            api.insertNodeControls(text, node);
            
            if (
                !api.nodeHasControls(node) &&
                !data.children().length &&
                settings.get("textSpeed") < 100
            ) {
                charAnimation = revealText(
                    text.querySelector(".current"),
                    ((settings.get("textSpeed") / 100) * 90) + 10
                );
                
                charAnimation.start();
            }
            
            setTimeout(function () {
                
                var className = "fitsInWindow";
                
                if (fitsInWindow(text)) {
                    classList(text).add(className).apply();
                }
                else {
                    classList(text).remove(className).apply();
                }
                
                scrolling.scrollToBottom(text);
                
            }, 50);
            
        }
    }
    
    function nodeHasControls(node) {
        return node.data.timeout ||
            node.links.length ||
            node.data.reveal === false;
    }
    
    function insertNodeControls(nodeElement, node) {
        
        var indicatorEnabled = false;
        var indicatorHintSetting = settings.get("indicatorHint");
        
        var useReturn = "useReturnIndicator" in node.data ?
            node.data.useReturnIndicator :
            settings.get("useReturnIndicator");
        
        var useNext = "useNextIndicator" in node.data ?
            node.data.useNextIndicator :
            settings.get("useNextIndicator");
        
        if (typeof node.data.timeout === "number") {
            addTimer(text);
        }
        
        if (
            node.data.autonext ||
            (!useNext && node.next) ||
            (!useNext && !useReturn && node.returnToLast)
        ) {
            indicatorEnabled = true;
            autonextIndicator.classList.remove("disabled");
        }
        else {
            autonextIndicator.classList.add("disabled");
        }
        
        if (useNext && (node.next || (!useReturn && node.returnToLast))) {
            indicatorEnabled = true;
            nextIndicator.classList.remove("disabled");
        }
        else {
            nextIndicator.classList.add("disabled");
        }
        
        if (useReturn && node.returnToLast) {
            indicatorEnabled = true;
            returnIndicator.classList.remove("disabled");
        }
        else {
            returnIndicator.classList.add("disabled");
        }
        
        clearTimeout(indicatorHintTimeout);
        disableIndicatorHint();
        
        if (indicatorHintSetting && indicatorEnabled) {
            indicatorHintTimeout = setTimeout(enableIndicatorHint, indicatorHintSetting);
        }
        
    }
    
    function enableIndicatorHint() {
        indicatorHint.classList.add("enabled");
    }
    
    function disableIndicatorHint() {
        indicatorHint.classList.remove("enabled");
    }
    
    function animateSectionExit(then) {
        
        if (then) {
            then();
        }
        
        // showCurtain(then);
    }
    
    function animateSectionEntry(then) {
        
        if (then) {
            then();
        }
        
        // hideCurtain(then);
    }
    
    function animateNodeExit(then) {
        if (then) {
            then();
        }
        // transform(1, 0, setOpacity(text), {duration: NODE_FADE_OUT}, then);
    }
    
    function animateNodeEntry(then) {
        if (then) {
            then();
        }
        // transform(0, 1, setOpacity(text), {duration: NODE_FADE_IN}, then);
    }
    
    function disarmOldTextItems() {
        
        var items = Array.prototype.slice.call(text.querySelectorAll(".current"));
        var clickables = Array.prototype.slice.call(text.querySelectorAll("[data-type]"));
        var focusables = Array.prototype.slice.call(text.querySelectorAll("[data-focus-mode]"));
        
        items.forEach(function (item) {
            item.classList.remove("current");
            item.classList.add("disarmed");
        });
        
        clickables.forEach(function (clickable) {
            clickable.removeAttribute("data-type");
            clickable.setAttribute("tabindex", "-1");
            clickable.classList.add("disarmed");
        });
        
        focusables.forEach(function (focusable) {
            focusable.removeAttribute("data-focus-mode");
        });
    }
    
    function addTimer(text) {
        
        var timeoutContainer = document.createElement("div");
        
        timeoutContainer.setAttribute("class", "timeout-container");
        timeoutContainer.setAttribute("data-type", "timeout");
        timeoutContainer.setAttribute("data-remaining", "100");
        timeoutContainer.setAttribute("data-progress", "0");
        
        updateTimer(100);
        text.querySelector(".current").appendChild(timeoutContainer);
        context.on("timer_update", updateTimer);
        
        function updateTimer(state) {
            
            var content = timerTemplate.replace(/{progress}/g, "" + state.percentage);
            
            content = content.replace(/{remaining}/g, "" + state.remaining);
            
            timeoutContainer.innerHTML = content;
        }
    }
    
    function insertLink(label, target) {
        
        if (!story.hasNode(target)) {
            throw new Error(
                "Unknown node referenced in link '" + label + "': " + target + " @" + 
                // @ts-ignore
                (typeof __line !== "undefined" ? __line : "unknown")
            );
        }
        
        return '<span class="link direct_link" tabindex="1" data-target="' + target +
            '" data-type="link" title="Link" data-focus-mode="node" data-link-type="direct_link">' +
            label + '</span>';
    }
    
    function linkify(text, target) {
        return text.replace(/\{([^}]*)\}/g, function (match, label) {
            return insertLink(label, target);
        });
    }
    
    function reflowElements() {
        scrolling.scrollToBottom(text);
    }
    
    function hideGameElements() {
        ui.style.display = "none";
        text.style.display = "none";
    }
    
    function showGameElements() {
        ui.style.display = "";
        text.style.display = "";
        scrolling.scrollToBottom(text, true);
    }
    
    function onUiClick(event) {
        
        var target = event.target.getAttribute("data-action") ?
            event.target :
            getClickableParent(event.target);
        
        var action = target.getAttribute("data-action");
        var screen = target.getAttribute("data-screen");
        var qsSlot = target.getAttribute("data-slot-name");
        
        if (action === "openScreen") {
            screens.run(screen);
        }
        else if (action === "toggleFullscreen") {
            system.toggleFullscreen();
        }
        else if (action === "runNode") {
            interpreter.runNodeById(target.getAttribute("data-node-id"));
        }
        else if (action === "quickSave") {
            interpreter.saveQuick(qsSlot, function (error) {
                notify(
                    error ? "Error while saving the game." : "Game saved in quick save slot.",
                    error ? "error" : "success",
                    NOTIFICATION_DURATION
                );
            });
        }
        else if (action === "quickLoad") {
            interpreter.hasQuickSlot(qsSlot, function (error, exists) {
                
                if (!exists) {
                    notify("Quick save slot is empty.", "error", NOTIFICATION_DURATION);
                    return;
                }
                
                confirm("Load quick save slot and discard progress?", function (yes) {
                    if (yes) {
                        interpreter.clearState();
                        interpreter.loadQuick(qsSlot, function (error) {
                            notify(
                                error ?
                                    "Error while loading game." :
                                    "Game loaded from quick save slot.",
                                error ? "error" : "success",
                                NOTIFICATION_DURATION
                            );
                        });
                    }
                });
            });
        }
    }
    
    function onContainerClick(event) {
        
        var link = event.target, parent;
        
        if (link.getAttribute("data-link-type") === "direct_link") {
            link.classList.add("clicked");
            interpreter.runNodeById(link.getAttribute("data-target"));
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars.set("_choice", JSON.parse(window.atob(link.getAttribute("data-value"))));
            
            if (link.getAttribute("data-target")) {
                link.classList.add("clicked");
                interpreter.runNodeById(link.getAttribute("data-target"));
            }
            else {
                if (!charAnimation || !charAnimation.cancel()) {
                    interpreter.next();
                }
            }
        }
        else {
            
            parent = getClickableParent(event.target);
            
            if (parent !== link && typeof parent.click === "function") {
                return parent.click();
            }
            
            if (!charAnimation || !charAnimation.cancel()) {
                interpreter.next();
            }
        }
    }
    
    function updateUi() {
        
        var elements = Array.prototype.slice.call(ui.querySelectorAll("[data-key]"));
        
        elements.forEach(function (element) {
            
            var key = element.getAttribute("data-key");
            var value = vars.get(key);
            
            element.innerHTML = value;
        });
    }
    
    function fitsInWindow(element) {
        
        var rect = element.getBoundingClientRect();
        
        return ((rect.width < window.innerWidth) && (rect.height < window.innerHeight));
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    name: "ui",
    version: "2.0.0",
    application: "toothrot",
    applicationVersion: "2.x",
    applicationSteps: ["run"],
    environments: ["browser"],
    create: create,
    channels: {
        exposes: {
            ui: ["nodeHasControls", "insertNodeControls"]
        }
    }
};
