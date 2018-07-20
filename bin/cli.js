#!/usr/bin/env node

//
// # Toothrot CLI Application Bootstrapper
//
// This script bootstraps a `multiversum` app to provide a CLI for toothrot. 
//

/* global process, __dirname */

var joinPath = require("path").join;
var semver = require("semver");
var createApp = require("multiversum/bootstrap").bootstrap;
var parseArgs = require("./args").parse;

// @ts-ignore
var package = require("../package.json");

var args = process.argv;
var flags = parseArgs(args).flags;

var TOOTHROT_DIR = joinPath(__dirname, "../");

var app = createApp([TOOTHROT_DIR, process.cwd()], {
    patterns: ["**/*.com.json"],
    onError: flags.debug ? undefined : function () {},
    filter: function (component) {
        
        if (component.application !== "toothrot") {
            return false;
        }
        
        if (!semver.satisfies(package.version, component.applicationVersion)) {
            return false;
        }
        
        //
        // Include components with flag `debug` only if `--debug` parameter is in argv
        //
        if (
            !flags.debug &&
            // @ts-ignore
            Array.isArray(component.flags) &&
            // @ts-ignore
            component.flags.indexOf("debug") >= 0
        ) {
            return false;
        }
        
        return component.applicationSteps.indexOf("build") >= 0;
    }
});

app.init();
