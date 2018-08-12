#!/usr/bin/env node

//
// # Toothrot CLI Application Bootstrapper
//
// This script bootstraps a `multiversum` app to provide a CLI for toothrot. 
//

/* global process */

var createApp = require("../index").createApp;
var parseArgs = require("./args").parse;

var args = process.argv;
var flags = parseArgs(args).flags;

var app = createApp({
    patterns: ["**/*.com.json"],
    environments: ["cli", "node", "any"],
    debug: flags.debug === true,
    onError: console.error.bind(console)
});

app.init();
