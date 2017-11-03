/* global setInterval, clearInterval */
/* eslint no-console: off */

require('smoothscroll-polyfill').polyfill();

var ctx = require("../utils/context.js");

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var components = {
    audio: require("../components/audio.js"),
    env: require("../components/env.js"),
    focus: require("../components/focus.js"),
    nodes: require("../components/nodes.js"),
    highlighter: require("../components/browser-ui/highlighter.js"),
    interpreter: require("../components/interpreter.js"),
    screens: require("../components/browser-ui/screens.js"),
    cartridges: require("../components/browser-ui/cartridges.js"),
    settings: require("../components/settings.js"),
    ui: require("../components/browser-ui/ui.js"),
    storage: require("../components/storage.js"),
    story: require("../components/story.js"),
    system: require("../components/system.js"),
    vars: require("../components/vars.js")
};

function run(resources, _) {
    
    var context = ctx.create({
        components: components,
        resources: resources
    });
    
    context.set("_", _ || {});
    
    context.init();
    
}

function decodeResources(resources) {
    return JSON.parse(decodeURIComponent(window.atob(resources)));
}

module.exports = {
    run: run,
    decode: decodeResources
};
