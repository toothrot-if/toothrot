
var createApp = require("multiversum/app").create;

// @ts-ignore
var components = require("./components");
var app = createApp();

app.on("error", console.error.bind(console));
app.on("app/error", console.error.bind(console));

Object.keys(components).forEach(function (name) {
    app.addComponent(components[name]);
});

app.init();

// @ts-ignore
window.TOOTHROT = app;
