/* eslint-disable no-console */
/* global process */

var parseArgs = require("./args").parse;

// @ts-ignore
var package = require("../package.json");

function create(context) {
    
    var api = context.createInterface("cli", {
        run: run,
        getCommands: getCommands
    });
    
    function init() {
        context.connectInterface(api);
        context.once("app/ready", api.run);
    }
    
    function destroy() {
        context.disconnectInterface(api);
    }
    
    function getCommands() {
        return {
            help: {
                run: showInfo,
                brief: "shows help/info for a command",
                usage: "[<command>]",
                description: "Shows general help when used without a command name. " +
                    "Shows help for a command if used with a command name."
            }
        };
    }
    
    function showInfo(args) {
        
        var command = args.args[1];
        var commands = api.getCommands();
        
        if (command && command in commands) {
            console.log("");
            console.log("Command `" + command + "`");
            console.log("--------------------------------");
            console.log("");
            console.log(commands[command].description);
            console.log("");
            console.log("Usage: toothrot " + command + " " + commands[command].usage);
            console.log("");
            return;
        }
        
        console.log("");
        console.log("Toothrot CLI (v" + package.version + ")");
        console.log("--------------------------------------------");
        console.log("");
        console.log("Run `toothrot help <command>` to get help about a command.");
        console.log("");
        console.log("The following commands are available:");
        console.log("");
        
        Object.keys(commands).forEach(function (commandName) {
            console.log(" * " + commandName + " -- " + commands[commandName].brief);
        });
        
        console.log("");
        
    }
    
    function run() {
        
        var commands = api.getCommands();
        var args = parseArgs(process.argv);
        var command = args.args[0];
        
        if (!command && args.flags.version) {
            console.log(package.version);
            return;
        }
        
        command = command && command in commands ? command : "help";
        
        commands[command].run(args);
        
    }
    
    return {
        init: init,
        destroy: destroy
    };
}

module.exports = {
    create: create
};
