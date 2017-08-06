/* eslint-disable no-console */

var clone = require("clone");
var merge = require("deepmerge");
var evalScript = require("../utils/evalScript");

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var none = function () {};

function create(context) {
    
    var story, vars, env, nodes, storage, settings, focus, currentNode, nextClickTime, timeoutId;
    
    // A stack for remembering which node to return to.
    var stack = [];
    
    function init() {
        
        env = context.getComponent("env");
        vars = context.getComponent("vars");
        story = context.getComponent("story");
        focus = context.getComponent("focus");
        nodes = context.getComponent("nodes");
        storage = context.getComponent("storage");
        settings = context.getComponent("settings");
        
        nextClickTime = Date.now();
        
        focus.setMode("screen");
    }
    
    function destroy() {
        env = null;
        vars = null;
        story = null;
    }
    
    function start() {
        clearState();
        runNode(story.getNode("start"));
    }
    
    function clearState() {
        stack = [];
        vars.clear();
        context.emit("clear_state");
    }
    
    function serialize() {
        
        var currentNodeId = currentNode ? currentNode.id : "start";
        
        return JSON.stringify({
            vars: vars.getAll(),
            stack: stack,
            node: currentNodeId,
            text: story.getNode(currentNodeId).content
        });
    }
    
    function resume(data) {
        
        vars.clear();
        
        data = JSON.parse(data);
        stack = data.stack;
        
        Object.keys(data.vars).forEach(function (key) {
            vars.set(key, data.vars[key]);
        });
        
        context.emit("resume_game", data);
        
        runNode(story.getNode(data.node));
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
                return;
            }
            
            resume(data.data);
            then();
        });
    }
    
    function save(name, then) {
        
        then = then || none;
        
        storage.save(name, serialize(), function (error) {
            
            if (error) {
                return;
            }
            
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
        var copy = merge(clone(story.getSection(node.section)), clone(node));
        
        copy.items = [];
        
        console.log("Running node '" + node.id + "'...");
        
        focus.setMode("node");
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
            context.emit("timer_end");
        }
        
        context.emit("before_run_node", node);
        
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
        
        env.set("addOption", function (label, target, value) {
            copy.options.push({
                type: "option",
                value: value || "",
                line: 0,
                label: "" + label,
                target: "" + (target || "")
            });
        });
        
        if (node.scripts.entry) {
            runScript(node.scripts.entry);
        }
        
        copy.content = copy.content.replace(/\(@\s*([a-zA-Z0-9_]+)\s*@\)/g, function (match, slot) {
            
            var script;
            var result = "";
            
            if (!(slot in node.scripts)) {
                console.warn("No script for slot '" + slot + "' at node '" + node.id + "'.");
                return "";
            }
            
            script = node.scripts[slot];
            
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
            console.log("Skipping from node '" + node.id + "' to '" + skipTo + "'.");
            return runNode(story.getNode(skipTo));
        }
        
        if (currentNode && !node.parent && nextType !== "return") {
            
            if (stack.indexOf(currentNode.id) >= 0) {
                stack.splice(0, stack.length);
            }
            
            stack.push(currentNode.id);
        }
        
        context.emit("run_node", copy);
        
        currentNode = node;
        
        storage.save("current", serialize());
        
        if (typeof data.get("timeout") === "number") {
            startTimer(node);
        }
        
        function runScript(script) {
            
            var result;
            
            try {
                result = evalScript(story.getAll(), env.getAll(), vars, script.body, script.line);
            }
            catch (error) {
                console.error("Cannot execute script at line " + script.line + ":", error);
            }
            
            return result;
        }
        
        function getSelf() {
            return nodes.get(node.id);
        }
    }
    
    function next() {
        
        var lastNodes, tag;
        
        if (focus.getMode() !== "node" || !currentNode) {
            return;
        }
        
        if (currentNode.next) {
            console.log("Going to next node...");
            runNode(story.getNode(currentNode.next), "next");
            nextClickTime = Date.now();
        }
        else if (currentNode.returnToLast && nextClickWaitTimeReached()) {
            
            lastNodes = vars.get("_lastNodes") || {};
            tag = currentNode.returnToLastTag;
            
            if (currentNode.returnToLastTag && lastNodes[tag]) {
                console.log("Returning to last node with tag '" + tag + "'...");
                runNode(story.getNode(lastNodes[tag]));
            }
            else {
                console.log("Returning to previous node...");
                runNode(story.getNode(stack.pop()), "return");
            }
            
            nextClickTime = Date.now();
        }
        
    }
    
    function nextClickWaitTimeReached() {
        return Date.now() - nextClickTime > NEXT_RETURN_WAIT;
    }
    
    function startTimer(node) {
        
        var timeout = node.data.timeout;
        var start = Date.now();
        
        context.emit("timer_start", timeout);
        
        function updateTimer(percentage) {
            
            var remaining = 100 - percentage;
            
            context.emit("timer_update", {
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
            
            context.emit("timer_end");
            
            if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (line " + node.line + ").");
                }
                
                vars._choice = options[node.defaultOption].value;
                
                runNode(story.getNode(options[node.defaultOption].target));
            }
            else if (options.length) {
                
                vars._choice = options[0].value;
                
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
        destroy: destroy,
        start: start,
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
        clearState: clearState,
        getCurrentNodeId: getCurrentNodeId
    };
    
}

module.exports = create;
