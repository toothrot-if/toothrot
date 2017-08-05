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

function parseScripts(node) {
    
    var pattern = /```js @([a-zA-Z0-9_]+)((.|\n)*?)\n```/g;
    
    node.content = node.content.replace(pattern, function (match, slot, body) {
        
        var line = countNewLines(node.content.split(match[0])[0]) + node.line + 1;
        
        slot = slot.trim();
        body = body.trim();
        
        node.scripts[slot] = {
            type: "script",
            slot: slot,
            line: line,
            body: body
        };
        
        return (new Array(line - node.line - 1)).join("\n");
        
    });
    
}

function parseNodeContent(handleError, node) {
    
    var linkPattern = /\[([^\)]+)\]\(#([a-zA-Z0-9_]+)\)/g;
    var oldContent = node.content;
    
    parseScripts(node);
    
    node.content = node.content.replace(linkPattern, function (match, label, target) {
        
        var line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        node.links.push(link("direct_link", label, target, line));
        
        return "(%l" + (node.links.length - 1) + "%)";
    });
    
    node.content = node.content.split("\n").map(function (line) {
        
        if (isSilentLine(line)) {
            return "";
        }
        
        return line;
        
    }).join("\n");
    
    node.content = replaceVarSyntax(node.content);
    node.content = replaceSlotSyntax(node.content);
    
    node.raw = oldContent;
    node.content = parseMarkdown(node.content);
}

function replaceVarSyntax(content) {
    return content.replace(/`\$([a-zA-Z0-9_]+)`/g, "($ $1 $)");
}

function replaceSlotSyntax(content) {
    return content.replace(/`\@([a-zA-Z0-9_]+)`/g, "(@ $1 @)");
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
                ast.meta.title = line.replace(/^#/, "").trim();
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
            currentNode.content += "\n";
        }
        else if (isReturnToLast(line)) {
            parseReturnToLast(line, lineOffset);
            currentNode.content += "\n";
        }
        else if (isOption(line)) {
            parseOption(line, lineOffset);
            currentNode.content += "\n";
        }
        else if (isProperty(line)) {
            parseProperty(line, lineOffset);
            currentNode.content += "\n";
        }
        else {
            currentNode.content += line + "\n";
        }
    });
    
    return ast;
    
    function setSection(line) {
        
        section = line.replace(/^##/, "").trim();
        
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
    
    function parseReturnToLast(line) {
        
        var returnTag = line.replace(/^\(<\)/, "").trim() || null;
        
        currentNode.returnToLast = true;
        currentNode.returnToLastTag = returnTag;
    }
    
    function parseOption(line, lineOffset) {
        
        var label, value, parts, valueParts, target, condition;
        
        if (!Array.isArray(currentNode.options)) {
            currentNode.options = [];
        }
        
        line = line.replace(/^\(@\)/, "");
        parts = line.split("???");
        condition = parts.length > 1 ? parts[0].trim() : null;
        parts = (parts.length > 1 ? parts[1] : line).split("=>");
        
        if (parts.length !== 2) {
            handleError(createError({
                id: "MALFORMED_OPTION",
                nodeId: currentNode.id,
                nodeLine: currentNode.line,
                lineOffset: lineOffset + 1
            }));
            return;
        }
        
        if (condition) {
            condition = {
                not: (/^!/).test(condition),
                flag: condition.replace(/^!/, "")
            };
        }
        
        valueParts = parts[1].split("|");
        label = parts[0].trim();
        target = valueParts[0].trim();
        
        value = (valueParts[1] ? valueParts[1].trim() : "");
        
        currentNode.options.push(option(label, target, value, condition, lineOffset));
    }
    
    function parseProperty(line, lineOffset, isSection) {
        
        var currentSection;
        var rawKey = line.split(":")[0];
        var value = line.split(rawKey + ":")[1];
        var key = rawKey.replace(/^\(#\)/, "").trim();
        
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
        id: line.replace(/^###/, "").trim(),
        content: "",
        line: lineOffset + 1,
        links: [],
        scripts: {},
        options: [],
        tags: [],
        flags: [],
        contains: [],
        wasIn: [],
        section: section
    };
}

function option(label, target, value, condition, lineOffset) {
    return {
        type: "option",
        value: value,
        line: lineOffset + 1,
        label: label,
        target: target,
        condition: condition
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
    return line.match(/^\*\*\*/);
}

function isTitle(line) {
    return line.match(/^#[^#]+/);
}

function isSectionTitle(line) {
    return line.match(/^##[^#]+/);
}

function isNodeTitle(line) {
    return line.match(/^###[^#]+/);
}

function removeComments(text) {
    return text.replace(/\(--.*?--\)/g, "");
}

module.exports = {
    parse: parse,
    parseNodeContent: parseNodeContent
};
