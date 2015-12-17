/* global require, Buffer, process, __dirname */

var fs = require("fs");
var ncp = require("ncp").ncp;
var rimraf = require("rimraf");
var normalize = require("path").normalize;
var pack = require("./packer").pack;
var os = require("os");

var engineFile = normalize(__dirname + "/../build/toothrot.js");

function build (dir, outputDir) {
    
    var resources, indexContent;
    var base = normalize((dir || process.cwd()) + "/");
    var buildDir = normalize(outputDir || (base + "build/"));
    var tmpDir = normalize(os.tmpdir() + "/toothrot_" + Math.round(Math.random() * 10000));
    var filesDir = normalize(base + "/files/");
    
    if (fs.existsSync(buildDir)) {
        rimraf(buildDir, function () {
            copyContents();
        });
    }
    else {
        copyContents();
    }
    
    function copyContents () {
        
        ncp(filesDir, tmpDir, function (error) {
            
            if (error) {
                return console.error(error);
            }
            
            ncp(tmpDir, buildDir, function (error) {
                
                if (error) {
                    return console.error(error);
                }
                
                fs.writeFileSync(
                    normalize(buildDir + "/toothrot.js"),
                    fs.readFileSync(engineFile)
                );
                
                resources = new Buffer(pack(base)).toString("base64");
                
                indexContent = "(function () {" +
                        "window.toothrotResources = '" + resources + "';" +
                    "}());";
                
                fs.writeFileSync(buildDir + "resources.js", indexContent);
                
                console.log("Toothrot Engine project built successfully in: " + buildDir);
            });
        });
    }
}

module.exports.build = build;
