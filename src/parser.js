/* global require, module */

var each = require("enjoy-core/each");
var bind = require("enjoy-core/bind");
var parseMarkdown = require("marked");

var createError = require("./utils/createError");
var validator = require("./validator");

//
// ## Function `parse(text[, then])`
//
// Parses a toothrot story file. The optional `then` parameter is a function with this signature:
//
//     function (errors, result)
//
// If the `then` function is present, `parse` returns `undefined` and gives its results to the
// `then` function. The `then` function's `errors` is either falsy (when there are no errors)
// or an array of errors encountered while parsing the story.
//
// If no `then` function is supplied, `parse` returns the abstract syntax tree (AST) or
// `undefined` if there were errors.
//
// If no `then` function is supplied, `parse` will throw when the first error is encountered.
//
function parse(text, then) {
    
    var ast, handleError;
    var errors = [];
    var hasThen = typeof then === "function";
    
    handleError = hasThen ? collectError : throwError;
    
    text = removeComments(text);
    ast = parseStructure(text, handleError);
    
    each(bind(parseNodeContent, handleError), ast.nodes);
    
    validateAst(ast);
    
    if (typeof then === "function") {
        then(errors.length ? errors : null, ast);
        return;
    }
    
    if (errors.length) {
        return;
    }
    
    return ast;
    
    function validateAst(ast) {
        return validator(handleError).validate(ast);
    }
    
    function collectError(error) {
        errors.push(error);
    }
    
    function throwError(error) {
        throw error;
    }
}

function parseNodeContent(handleError, node) {
    
    var oldContent = node.content;
    
    node.content = node.content.replace(/\(!((.|\n)*?)!\)/g, function (match, p1) {
        
        var line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        node.scripts.push({
            type: "script",
            line: line,
            body: p1.trim()
        });
        
        return "(%s" + (node.scripts.length - 1) + "%)";
    });
    
    node.content = node.content.replace(/\(:((.|\n)*?):\)/g, function (match, p1) {
        
        var parts = p1.split("=>");
        var label, target, line;
        
        if (parts.length !== 2) {
            handleError(createError({
                id: "MALFORMED_LINK",
                nodeId: node.id,
                nodeLine: node.line
            }));
            return "";
        }
        
        label = parts[0].trim();
        target = parts[1].trim();
        
        line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        node.links.push(link("direct_link", label, target, line));
        
        return "(%l" + (node.links.length - 1) + "%)";
    });
    
    
    node.content = node.content.replace(/\(#((.|\n)*?)#\)/g, function (match, p1) {
        
        var parts = p1.split("=>");
        var label, targets, line;
        
        if (parts.length !== 2) {
            handleError(createError({
                id: "MALFORMED_OBJECT_LINK",
                nodeId: node.id,
                nodeLine: node.line
            }));
            return "";
        }
        
        label = parts[0].trim();
        targets = parts[1].trim();
        line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        try {
            targets = JSON.parse(targets);
        }
        catch (error) {
            handleError(createError({
                id: "INVALID_JSON_IN_OBJECT_LINK",
                nodeId: node.id,
                nodeLine: node.line,
                errorMessage: error.message
            }));
            return "";
        }
        
        node.links.push(link("object_link", label, targets, line));
        
        return "(%l" + (node.links.length - 1) + "%)";
    });
    
    node.content = node.content.split("\n").map(function (line) {
        
        if (isSilentLine(line)) {
            return "";
        }
        
        return line;
        
    }).join("\n");
    
    node.raw = oldContent;
    node.content = parseMarkdown(node.content);
}

function parseStructure(text, handleError) {
    
    var lines = text.split("\n");
    var currentNode, parentNode, section, subNodeOffset = 0;
    var foundFirstSection = false;
    
    var ast = {
        meta: {
            title: "",
            description: "",
            parseTime: Date.now()
        },
        head: {
            content: ""
        },
        nodes: {},
        sections: {}
    };
    
    lines.forEach(function (line, lineOffset) {
        
        if (!currentNode) {
            
            if (isTitle(line)) {
                ast.meta.title = line.replace(/^#:/, "").trim();
            }
            else if (isSectionTitle(line)) {
                setSection(line);
            }
            else if (isNodeTitle(line)) {
                addNode(line, lineOffset);
            }
            else if (section && isProperty(line)) {
                parseProperty(line, lineOffset, true);
            }
            else if (!foundFirstSection) {
                ast.head.content += line + "\n";
            }
        }
        else if (isSectionTitle(line)) {
            setSection(line);
            foundFirstSection = true;
            currentNode = null;
        }
        else if (isNodeTitle(line)) {
            addNode(line, lineOffset);
        }
        else if (isNodeSeparator(line)) {
            addAnonymousNode(line, lineOffset);
        }
        else if (isNextCommand(line)) {
            parseNextCommand(line, lineOffset);
        }
        else if (isReturnToLast(line)) {
            parseReturnToLast(line, lineOffset);
        }
        else if (isOption(line)) {
            parseOption(line, lineOffset);
        }
        else if (isProperty(line)) {
            parseProperty(line, lineOffset);
        }
        else {
            currentNode.content += line + "\n";
        }
    });
    
    return ast;
    
    function setSection(line) {
        
        section = line.replace(/^##:/, "").trim();
        
        if (!ast.sections[section]) {
            ast.sections[section] = {};
        }
        
    }
    
    function addNode(line, lineOffset) {
        subNodeOffset = 0;
        currentNode = node(line, lineOffset, section);
        parentNode = currentNode;
        ast.nodes[currentNode.id] = currentNode;
    }
    
    function addAnonymousNode(line, lineOffset) {
        
        subNodeOffset += 1;
        currentNode = node(parentNode.id + "_" + subNodeOffset, lineOffset, section);
        ast.nodes[currentNode.id] = currentNode;
        
        parentNode.isParent = true;
        currentNode.parent = parentNode.id;
        
        if (subNodeOffset > 1) {
            ast.nodes[parentNode.id + "_" + (subNodeOffset - 1)].next = currentNode.id;
        }
        else {
            ast.nodes[parentNode.id].next = currentNode.id;
        }
    }
    
    function parseNextCommand(line, lineOffset) {
        
        var next = line.replace(/^\(>\)/, "").trim();
        
        if (currentNode.next) {
            handleError(createError({
                id: "MULTIPLE_NEXT_NODES",
                nodeId: currentNode.id,
                nodeLine: currentNode.line,
                lineOffset: lineOffset + 1
            }));
        }
        
        currentNode.next = next;
    }
    
    function parseReturnToLast() {
        currentNode.returnToLast = true;
    }
    
    function parseOption(line, lineOffset) {
        
        var label, value, parts, valueParts, target;
        
        if (!Array.isArray(currentNode.options)) {
            currentNode.options = [];
        }
        
        line = line.replace(/^\(@\)/, "");
        parts = line.split("=>");
        
        if (parts.length !== 2) {
            handleError(createError({
                id: "MALFORMED_OPTION",
                nodeId: currentNode.id,
                nodeLine: currentNode.line,
                lineOffset: lineOffset + 1
            }));
            return;
        }
        
        valueParts = parts[1].split("|");
        label = parts[0].trim();
        target = valueParts[0].trim();
        
        value = (valueParts[1] ? valueParts[1].trim() : "");
        
        currentNode.options.push(option(label, target, value, lineOffset));
    }
    
    function parseProperty(line, lineOffset, isSection) {
        
        var rawKey = line.split(":")[0];
        var value = line.split(rawKey + ":")[1];
        var key = rawKey.replace(/^\(#\)/, "").trim();
        var currentSection;
        
        if (isSection) {
            
            currentSection = ast.sections[section];
            
            try {
                currentSection[key] = JSON.parse(value);
            }
            catch (error) {
                handleError(createError({
                    id: "INVALID_JSON_IN_SECTION_PROPERTY",
                    section: section,
                    sectionLine: currentSection.line,
                    property: key,
                    errorMessage: error.message
                }));
            }
        }
        else {
            try {
                currentNode[key] = JSON.parse(value);
            }
            catch (error) {
                handleError(createError({
                    id: "INVALID_JSON_IN_NODE_PROPERTY",
                    nodeId: currentNode.id,
                    nodeLine: currentNode.line,
                    property: key,
                    errorMessage: error.message
                }));
            }
        }
    }
}

function countNewLines(text) {
    return text.split("\n").length - 1;
}

function node(line, lineOffset, section) {
    return {
        id: line.replace(/^###:/, "").trim(),
        content: "",
        line: lineOffset + 1,
        links: [],
        scripts: [],
        options: [],
        section: section
    };
}

function option(label, target, value, lineOffset) {
    return {
        type: "option",
        value: value,
        line: lineOffset + 1,
        label: label,
        target: target
    };
}

function link(type, label, target, line) {
    return {
        type: type,
        label: label,
        target: target,
        line: line
    };
}

function isSilentLine(line) {
    return line.match(/^\(-\)/);
}

function isProperty(line) {
    return line.match(/^\(#\)/);
}

function isOption(line) {
    return line.match(/^\(\@\)/);
}

function isNextCommand(line) {
    return line.match(/^\(>\)/);
}

function isReturnToLast(line) {
    return line.match(/^\(<\)/);
}

function isNodeSeparator(line) {
    return line.match(/^\(~~~\)/);
}

function isTitle(line) {
    return line.match(/^#:/);
}

function isSectionTitle(line) {
    return line.match(/^##:/);
}

function isNodeTitle(line) {
    return line.match(/^###:/);
}

function removeComments(text) {
    return text.replace(/\(--.*?--\)/g, "");
}

module.exports = {
    parse: parse,
    parseNodeContent: parseNodeContent
};
