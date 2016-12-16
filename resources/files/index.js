/* global __dirname, process */

var win;

var electron = require("electron");
var path = require("path");
var url = require("url");

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

function start () {
    
    win = new BrowserWindow({width: 800, height: 600});
    
    win.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true
    }));
    
    /* win.webContents.openDevTools(); */
    
    win.on("closed", function () {
        win = null;
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
