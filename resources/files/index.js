/* global __dirname, process */

var win, config;

var electron = require("electron");
var path = require("path");
var url = require("url");
var fs = require("fs");

var app = electron.app;
var configPath = path.normalize(app.getPath("userData") + "/config.json");
var BrowserWindow = electron.BrowserWindow;

if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
        fullscreen: true,
        width: 960,
        height: 540
    }));
}

config = JSON.parse(fs.readFileSync(configPath));

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

function start() {
    
    win = new BrowserWindow({
        width: config.width,
        height: config.height,
        fullscreen: config.fullscreen
    });
    
    win.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true
    }));
    
    /* win.webContents.openDevTools(); */
    
    win.on("resize", function () {
        
        var size = win.getSize();
        
        config.fullscreen = win.isFullScreen();
        
        if (!config.fullscreen) {
            config.width = size[0];
            config.height = size[1];
        }
    });
    
    win.on("closed", function () {
        win = null;
        saveConfig();
    });
}

app.on("ready", start);

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function () {
    if (win === null) {
        start();
    }
});
