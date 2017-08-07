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
    
    var ui, text, indicator, optionsParent, optionsContainer;
    var container, screenContainer, templates, currentNode, currentSection;
    var charAnimation, notify, timerTemplate, story, vars, interpreter, screens, highlighter;
    var system, settings, env, focus, confirm, nodes, bg1, bg2, bg3;
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        story = context.getComponent("story");
        focus = context.getComponent("focus");
        nodes = context.getComponent("nodes");
        system = context.getComponent("system");
        screens = context.getComponent("screens");
        settings = context.getComponent("settings");
        interpreter = context.getComponent("interpreter");
        highlighter = context.getComponent("highlighter");
        
        templates = context.getResource("templates");
        notify = createNotification(templates.notification);
        confirm = createConfirm(context);
        
        timerTemplate = '<div class="TimerBar" style="width: {remaining}%;"></div>';
        
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
        
        // Actions and options are put into a parent element
        // so that clicks can be intercepted and to allow
        // more flexibility in styling the elements with CSS.
        optionsParent = document.createElement("div");
        
        optionsContainer = document.createElement("div");
        screenContainer = document.createElement("div");
        
        // The container element always has the current section name
        // in the "data-section" attribute so that everything can be
        // styled completely differently for each section.
        container.setAttribute("data-section", story.getNode("start").section);
        
        container.setAttribute("class", "Toothrot");
        
        bg1.setAttribute("class", "toothrot-bg1");
        bg2.setAttribute("class", "toothrot-bg2");
        bg3.setAttribute("class", "toothrot-bg3");
        
        text.setAttribute("class", "Text");
        text.setAttribute("aria-live", "polite");
        text.setAttribute("aria-atomic", "true");
        text.setAttribute("aria-relevant", "text");
        text.setAttribute("role", "main");
        
        optionsParent.setAttribute("class", "OptionsCurtain");
        optionsContainer.setAttribute("class", "OptionsContainer");
        screenContainer.setAttribute("class", "ScreenContainer");
        
        optionsParent.appendChild(optionsContainer);
        container.appendChild(text);
        container.appendChild(screenContainer);
        document.body.appendChild(bg1);
        document.body.appendChild(bg2);
        document.body.appendChild(bg3);
        document.body.appendChild(container);
        document.body.appendChild(ui);
        
        ui.innerHTML = format(templates.ui, vars.getAll());
        
        ui.setAttribute("role", "navigation");
        
        indicator = ui.querySelector(".next-indicator");
        
        indicator.setAttribute("title", "Click or press space to continue");
        indicator.setAttribute("tabindex", "1");
        
        ui.addEventListener("click", onUiClick);
        container.addEventListener("click", onContainerClick);
        screenContainer.addEventListener("click", context.emit.bind(context, "screen_click"));
        optionsParent.addEventListener("click", onOptionsParentClick);
        window.addEventListener("keyup", onKeyUp);
        
        window.addEventListener("resize", reflowElements);
        window.addEventListener("orientationchange", reflowElements);
        document.addEventListener("fullscreenchange", reflowElements);
        document.addEventListener("webkitfullscreenchange", reflowElements);
        document.addEventListener("mozfullscreenchange", reflowElements);
        document.addEventListener("MSFullscreenChange", reflowElements);
        
        context.set("stage_container", container);
        context.set("screen_container", screenContainer);
        
        context.on("fullscreen_change", reflowElements);
        context.on("screen_entry", hideGameElements);
        context.on("screen_exit", showGameElements);
        context.on("clear_state", onClearState);
        context.on("run_node", onNodeChange);
        context.on("start", onStart);
        
        env.set("link", insertLink);
    
        window.addEventListener("keydown", function (event) {
            if (event.keyCode === KEY_CODE_UP || event.keyCode === KEY_CODE_DOWN) {
                event.preventDefault();
            }
        });
        
        document.title = story.getTitle();
        
        scrolling.scrollToBottom(text);
    }
    
    function destroy() {
        
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
                    context.emit("section_change", node.section);
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
            
            currentNode = node;
            currentSection = node.section;
            
            container.setAttribute("data-node-id", currentNode.id);
            container.setAttribute("data-section", currentNode.section);
            
            if (data.has("background")) {
                bg = data.get("background");
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
                
                if (typeof vars[key] !== "undefined") {
                    return vars[key];
                }
                
                console.warn("Undefined variable in node '" + node.id +
                    "' (line " + node.line + "): " + key);
                
                return "";
            });
            
            content += node.items.map(function (item) {
                
                var description = item.text;
                
                if (!description) {
                    return "";
                }
                
                description = description.replace(/\{([^}]*)\}/g, function (match, label) {
                    return insertLink(label, item.id);
                });
                
                return '<p class="itemDescription">' + description + '</p>';
                
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
            text.innerHTML += '<div class="TextItem current">' + content + "</div>";
            
            if (
                node.options.length ||
                node.data.timeout ||
                node.links.length ||
                node.reveal === false ||
                data.children().length ||
                settings.get("textSpeed") >= 100
            ) {
                insertSpecials();
            }
            else {
                
                insertSpecials();
                
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
            
            function insertSpecials() {
                
                if (typeof node.data.timeout === "number") {
                    addTimer(text);
                }
                
                if (node.options.length) {
                    addOptions(text, node);
                }
                
                if (node.next || node.returnToLast) {
                    indicator.classList.remove("disabled");
                }
                else {
                    indicator.classList.add("disabled");
                }
            }
            
        }
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
    
    function addOptions(container, node) {
        
        optionsContainer.innerHTML = "";
        
        node.options.forEach(function (option) {
            addOption(option, node);
        });
        
        container.querySelector(".current").appendChild(optionsParent);
    }
    
    function addOption(opt) {
        
        var option = document.createElement("span");
        
        option.setAttribute("class", "Option");
        option.setAttribute("data-type", "option");
        option.setAttribute("data-target", opt.target);
        option.setAttribute("data-focus-mode", "node");
        option.setAttribute("tabindex", "1");
        option.setAttribute("title", "Option");
        option.setAttribute("data-value", window.btoa(JSON.stringify(opt.value)));
        
        option.innerHTML = opt.label;
        
        optionsContainer.appendChild(option);
    }
    
    function addTimer(text) {
        
        var timeoutContainer = document.createElement("div");
        
        timeoutContainer.setAttribute("class", "TimeoutContainer");
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
                (typeof __line !== "undefined" ? __line : "unknown")
            );
        }
        
        return '<span class="link direct_link" tabindex="1" data-target="' + target +
            '" data-type="link" title="Link" data-focus-mode="node" data-link-type="direct_link">' +
            label + '</span>';
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
    
    function onOptionsParentClick(event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
        }
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
        else if (action === "quickSave") {
            interpreter.saveQuick(qsSlot, function () {
                notify("Game saved in quick save slot.", "success", NOTIFICATION_DURATION);
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
                        interpreter.loadQuick(qsSlot, function () {
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
    }
    
    function onContainerClick(event) {
        
        var link = event.target, parent;
        
        if (link.getAttribute("data-link-type") === "direct_link") {
            link.classList.add("clicked");
            interpreter.runNodeById(link.getAttribute("data-target"));
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars._choice = JSON.parse(window.atob(link.getAttribute("data-value")));
            
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
    
    
    function fitsInWindow(element) {
        
        var rect = element.getBoundingClientRect();
        
        return ((rect.width < window.innerWidth) && (rect.height < window.innerHeight));
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = create;
