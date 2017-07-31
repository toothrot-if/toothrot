/* global setInterval, clearInterval */
/* eslint no-console: off */

require('smoothscroll-polyfill').polyfill();

var ctx = require("./utils/context.js");
var objects = require("./objects.js");

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var components = {
    audio: require("./components/audio.js"),
    env: require("./components/env.js"),
    focus: require("./components/focus.js"),
    highlighter: require("./components/highlighter.js"),
    interpreter: require("./components/interpreter.js"),
    screens: require("./components/screens.js"),
    settings: require("./components/settings.js"),
    stage: require("./components/stage.js"),
    storage: require("./components/storage.js"),
    story: require("./components/story.js"),
    system: require("./components/system.js"),
    vars: require("./components/vars.js")
};

function run(resources, _) {
    
    var vars, env;
    
    var context = ctx.create({
        components: components,
        resources: resources
    });
    
    vars = context.getComponent("vars");
    env = context.getComponent("env");
    
    vars.set("_objects", objects.assembleAll(resources.objects || {}));
    
    _ = _ || {};
    
    Object.keys(_).forEach(function (key) {
        env.set(key, _[key]);
    });
    
}

function decodeResources(resources) {
    return JSON.parse(decodeURIComponent(window.atob(resources)));
}

module.exports = {
    run: run,
    decode: decodeResources
};
