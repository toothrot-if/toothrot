/* eslint-disable no-console */

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var none = function () {};

function create(context) {
    
    var serialized, currentNextType, currentSection, started, focus, vars, logger, clone, merge;
    var story, env, nodes, storage, settings, currentNode, nextClickTime, timeoutId;
    
    // A stack for remembering which node to return to.
    var stack = [];
    
    // We cache savegames here that have been generated during the current run
    // so that they can be added without accessing the storage when all game data
    // is exported.
    var savegames = {};
    
    var api = context.createInterface("interpreter", {
        start: start,
        isStarted: isStarted,
        runNode: runNode,
        runNodeById: runNodeById,
        next: next,
        save: save,
        load: load,
        hasSlot: hasSlot,
        hasCurrentSlot: hasCurrentSlot,
        loadCurrentSlot: loadCurrentSlot,
        hasQuickSlot: hasQuickSlot,
        loadQuick: loadQuick,
        saveQuick: saveQuick,
        getState: getState,
        clearState: clearState,
        updateState: updateState,
        getCurrentNodeId: getCurrentNodeId
    });
    
    var evalScript = context.channel("scripts/run").call;
    
    function init() {
        
        var getModule = context.channel("getModule").call;
        
        clone = getModule("clone");
        merge = getModule("deepmerge");
        
        context.connectInterface(api);
        
        env = context.getInterface("env", ["set", "getAll"]);
        vars = context.getInterface("vars", ["clear", "get", "set", "getAll"]);
        nodes = context.getInterface("nodes", ["get"]);
        logger = context.getInterface("logger", ["log", "error"]);
        focus = context.getInterface("focus", ["setMode", "getMode"]);
        storage = context.getInterface("storage", ["save", "load"]);
        settings = context.getInterface("settings", ["getAll", "update", "set"]);
        
        story = context.getInterface("story", [
            "getNode",
            "getSection",
            "getNodeIds",
            "getSectionIds",
            "getNodeScript",
            "getSectionScript",
            "getGlobalScript",
            "hasNodeScript",
            "hasSectionScript",
            "hasGlobalScript",
            "getAll"
        ]);
        
        nextClickTime = Date.now();
        
        focus.setMode("screen");
    }
    
    function destroy() {
        
        context.disconnectInterface(api);
        
        env = null;
        vars = null;
        story = null;
        nodes = null;
        focus = null;
        logger = null;
        storage = null;
        settings = null;
    }
    
    function start() {
        
        clearState();
        
        started = true;
        
        runNode(story.getNode("start"));
    }
    
    function isStarted() {
        return !!started;
    }
    
    function clearState() {
        stack = [];
        started = false;
        vars.clear();
        context.publish("clear_state");
    }
    
    function getState() {
        
        var data = {
            current: serialized,
            savegames: clone(savegames),
            settings: settings.getAll()
        };
        
        return data;
    }
    
    function updateState(data) {
        
        clearState();
        
        if (data.settings) {
            logger.log("Updating settings from saved state...");
            settings.update(data.settings);
        }
        
        if (data.savegames) {
            overwriteStorageSlots(data.savegames);
        }
        
        context.publish("update_state");
        
        if (data.current) {
            logger.log("Resuming game from saved state...");
            overwriteStorageSlot("current", data.current);
            settings.set("current_slot_exists", true);
        }
    }
    
    function overwriteStorageSlots(data) {
        Object.keys(data).forEach(function (name) {
            overwriteStorageSlot(name, data[name]);
        });
    }
    
    function overwriteStorageSlot(name, data) {
        
        storage.save(name, data, function (error) {
            
            if (error) {
                logger.error("Couldn't replace slot '" + name + "' with import data.");
                return;
            }
            
            logger.log("Slot '" + name + "' replaced with import data.");
        });
    }
    
    function serialize() {
        
        var currentNodeId = currentNode ? currentNode.id : "start";
        
        var info = context.channel("vars/get").call("_savegameInfo") || {
            text: story.getNode(currentNodeId).content
        };
        
        var data = {
            vars: vars.getAll(),
            stack: stack.slice(),
            node: currentNodeId,
            currentNextType: currentNextType
        };
        
        if (info && typeof info === "object") {
            Object.keys(info).forEach(function (key) {
                data[key] = info[key];
            });
        }
        
        return JSON.stringify(data);
    }
    
    function resume(data) {
        
        var currentNodeId;
        
        vars.clear();
        
        data = JSON.parse(data);
        stack = data.stack.slice();
        currentNextType = data.currentNextType;
        currentNodeId = stack.pop();
        
        if (currentNodeId) {
            currentNode = story.getNode(currentNodeId);
        }
        
        Object.keys(data.vars).forEach(function (key) {
            vars.set({key: key, value: data.vars[key]});
        });
        
        started = true;
        
        context.publish("resume_game", data);
        
        runNode(story.getNode(data.node), currentNextType);
    }
    
    function loadCurrentSlot() {
        load("current");
    }
    
    function hasCurrentSlot(then) {
        return hasSlot("current", function (error, exists) {
            
            if (exists) {
                settings.set("current_slot_exists", true);
            }
            
            if (then) {
                then(error, exists);
            }
        });
    }
    
    function hasSlot(name, then) {
        storage.load(name, function (error, data) {
            then(error, !!data);
        });
    }
    
    function load(name, then) {
        
        then = then || none;
        
        storage.load(name, function (error, data) {
            
            if (error) {
                return then(error);
            }
            
            resume(data.data);
            then();
        });
    }
    
    function save(name, then) {
        
        var data = serialized;
        
        then = then || none;
        
        storage.save(name, data, function (error) {
            
            if (error) {
                return then(error);
            }
            
            savegames[name] = data;
            
            then();
        });
    }
    
    function hasQuickSlot(quickSlotId, then) {
        return hasSlot("qs_" + quickSlotId, then);
    }
    
    function loadQuick(quickSlotId, then) {
        return load("qs_" + quickSlotId, then);
    }
    
    function saveQuick(quickSlotId, then) {
        return save("qs_" + quickSlotId, then);
    }
    
    function runNodeById(node) {
        runNode(story.getNode(node));
    }
    
    function runNode(node, nextType) {
        
        var skipTo;
        var data = nodes.get(node.id);
        var lastSection = currentSection;
        var section = story.getSection(node.section);
        var copy = merge(clone(section), clone(node));
        
        currentNextType = nextType;
        currentSection = node.section;
        
        copy.events = [];
        copy.items = [];
        
        logger.log("Running node '" + node.id + "'...");
        
        focus.setMode("node");
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
            context.publish("timer_end");
        }
        
        context.publish("before_run_node", node);
        
        env.set("event", function (text) {
            copy.events.push(text);
        });
        
        env.set("events", function () {
            return copy.events.slice();
        });
        
        env.set("skipTo", function (id) {
            skipTo = id;
        });
        
        env.set("node", function (id) {
            
            if (id) {
                return nodes.get(id);
            }
            
            return nodes.get(copy.id);
        });
        
        env.set("self", getSelf);
        
        env.set("eachNode", function (fn) {
            story.getNodeIds().forEach(fn);
        });
        
        env.set("eachSection", function (fn) {
            story.getSectionIds().forEach(fn);
        });
        
        env.set("addOption", function (label, target, value) {
            copy.options.push({
                type: "option",
                value: value || "",
                line: 0,
                label: "" + label,
                target: "" + (target || "")
            });
        });
        
        env.set("execNodeScript", function (nodeName, slot) {
            
            var script = story.getNodeScript(nodeName, slot);
            
            if (script) {
                return runScript(script);
            }
        });
        
        env.set("execSectionScript", function (sectionName, slot) {
            
            var script = story.getSectionScript(sectionName, slot);
            
            if (script) {
                return runScript(script);
            }
        });
        
        env.set("execGlobalScript", function (slot) {
            
            var script = story.getGlobalScript(slot);
            
            if (script) {
                return runScript(script);
            }
        });
        
        env.set("hasNodeScript", function (nodeName, slot) {
            return story.hasNodeScript(nodeName, slot);
        });
        
        env.set("hasSectionScript", function (sectionName, slot) {
            return story.hasSectionScript(sectionName, slot);
        });
        
        env.set("hasGlobalScript", function (slot) {
            return story.hasGlobalScript(slot);
        });
        
        env.set("removeLinks", function (text) {
            return text.replace(/\{([^\}]+)\}/g, "$1");
        });
        
        if (lastSection !== currentSection) {
            
            if (story.hasGlobalScript("section_entry")) {
                runScript(story.getGlobalScript("section_entry"));
            }
            
            if (section.scripts.entry) {
                runScript(section.scripts.entry);
            }
        }
        
        if (story.hasGlobalScript("node_entry")) {
            runScript(story.getGlobalScript("node_entry"));
        }
        
        if (story.hasSectionScript(node.section, "node_entry")) {
            runScript(story.getSectionScript(node.section, "node_entry"));
        }
        
        if (node.scripts.entry) {
            runScript(node.scripts.entry);
        }
        
        copy.content = copy.content.replace(/\(@\s*([a-zA-Z0-9_]+)\s*@\)/g, function (match, slot) {
            
            var script;
            var result = "";
            
            if (
                !(slot in node.scripts) &&
                !(slot in section.scripts) &&
                !story.hasGlobalScript(slot)
            ) {
                console.warn("No script for slot '" + slot + "' at node '" + node.id + "'.");
                return "";
            }
            
            script = node.scripts[slot] || section.scripts[slot] || story.getGlobalScript(slot);
            
            result = runScript(script);
            
            return result || "";
        });
        
        if (data.isntSneaky()) {
            
            data.raw().contains.forEach(function (id) {
                
                var scriptResult;
                var item = story.getNode(id);
                var data = nodes.get(id).raw();
                
                if (!item || !item.scripts.brief) {
                    return;
                }
                
                if (data.wasIn.indexOf(node.id) < 0) {
                    data.wasIn.push(node.id);
                }
                
                env.set("self", function () {
                    return nodes.get(id);
                });
                
                scriptResult = runScript(item.scripts.brief);
                
                copy.items.push({
                    id: item.id,
                    text: scriptResult
                });
                
                env.set("self", getSelf);
            });
        }
        
        copy.options = copy.options.filter(function (option) {
            
            var hasFlag;
            
            if (!option.condition) {
                return true;
            }
            
            hasFlag = nodes.get(node.id).is(option.condition.flag);
            
            return (option.condition.not ? !hasFlag : hasFlag);
        });
        
        if (skipTo) {
            logger.log("Skipping from node '" + node.id + "' to '" + skipTo + "'.");
            return runNode(story.getNode(skipTo));
        }
        
        if (currentNode && !node.parent && nextType !== "return") {
            
            if (stack.indexOf(currentNode.id) >= 0) {
                stack.splice(0, stack.length);
            }
            
            stack.push(currentNode.id);
        }
        
        currentNode = node;
        serialized = serialize();
        
        storage.save("current", serialized);
        context.publish("run_node", copy);
        
        if (typeof data.get("autonext") === "number") {
            startTimer(node, data.get("autonext"), data.get("autonextTarget"));
        }
        else if (typeof data.get("timeout") === "number") {
            startTimer(node);
        }
        
        function runScript(script) {
            
            var result;
            
            try {
                result = evalScript(
                    context,
                    story.getAll(),
                    env.getAll(),
                    vars.getAll(),
                    script.body,
                    script.line,
                    script.file
                );
            }
            catch (error) {
                logger.error(
                    "Cannot execute script (<" + script.file + ">@" + script.line + "):",
                    error
                );
            }
            
            return result;
        }
        
        function getSelf() {
            return nodes.get(node.id);
        }
    }
    
    function next(autonextTarget) {
        
        var lastNodes, tag;
        
        if (focus.getMode() !== "node" || !currentNode) {
            return;
        }
        
        if (autonextTarget) {
            logger.log("Going to autonextTarget ('" + autonextTarget + "')...");
            runNode(story.getNode(autonextTarget), "autonextTarget");
            nextClickTime = Date.now();
        }
        else if (currentNode.next) {
            logger.log("Going to next node ('" + currentNode.next + "')...");
            runNode(story.getNode(currentNode.next), "next");
            nextClickTime = Date.now();
        }
        else if (currentNode.returnToLast && nextClickWaitTimeReached()) {
            
            lastNodes = vars.get("_lastNodes") || {};
            tag = currentNode.returnToLastTag;
            
            if (tag && lastNodes[tag]) {
                logger.log(
                    "Returning to last node with tag '" + tag +
                    "' ('" + lastNodes[tag] + "')..."
                );
                runNode(story.getNode(lastNodes[tag]), "returnToLastTag");
            }
            else {
                logger.log(
                    "Returning from node '" + currentNode.id + "' to previous node '" +
                    stack[stack.length - 1] + "'..."
                );
                runNode(story.getNode(stack.pop()), "return");
            }
            
            nextClickTime = Date.now();
        }
        
    }
    
    function nextClickWaitTimeReached() {
        return Date.now() - nextClickTime > NEXT_RETURN_WAIT;
    }
    
    function startTimer(node, autonext, autonextTarget) {
        
        var timeout = typeof autonext === "number" ? autonext : node.data.timeout;
        var start = Date.now();
        
        context.publish("timer_start", timeout);
        
        function updateTimer(percentage) {
            
            var remaining = 100 - percentage;
            
            context.publish("timer_update", {
                percentage: percentage,
                remaining: remaining
            });
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
            
            context.publish("timer_end");
            
            if (autonextTarget) {
                next(autonextTarget);
            }
            else if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (<" + node.file + ">@" + node.line + ").");
                }
                
                vars.set({
                    key: "_choice",
                    value: options[node.defaultOption].value
                });
                
                runNode(story.getNode(options[node.defaultOption].target));
            }
            else if (options.length) {
                
                vars.set({key: "_choice", value: options[0].value});
                
                runNode(story.getNode(options[0].target));
            }
            else {
                next();
            }
        }, 50);
    }
    
    function getCurrentNodeId() {
        if (currentNode) {
            return currentNode.id;
        }
    }
    
    return {
        init: init,
        destroy: destroy
    };
    
}

module.exports = {
    create: create
};
