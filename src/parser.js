/* global require, module */

var each = require("enjoy-core/each");
var bind = require("enjoy-core/bind");
var clone = require("clone");
var parseMarkdown = require("marked");

var createError = require("./utils/createError");
var validator = require("./validator");

var scriptPattern = /```js @([a-zA-Z0-9_]+)((.|\n)*?)\n```/g;
var hierarchyPattern = /```json @hierarchy((.|\n)*?)\n```/g;

var currentFile;
var currentFileLineOffset = 0;

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

function parseScripts(node, oldContent) {
    
    var pattern = scriptPattern;
    
    node.content = node.content.replace(pattern, function (match, slot, body) {
        
        var line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        slot = slot.trim();
        body = body.trim();
        
        node.scripts[slot] = {
            type: "script",
            slot: slot,
            file: node.file,
            line: line,
            body: body
        };
        
        return (new Array(line - node.line - 1)).join("\n");
        
    });
    
}

function parseNodeContent(handleError, node) {
    
    var linkPattern = /\[([^\)]+)\]\(#([a-zA-Z0-9_]+)\)/g;
    var oldContent = node.content;
    
    parseScripts(node, oldContent);
    
    node.content = node.content.replace(linkPattern, function (match, label, target) {
        
        var line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        node.links.push(link("direct_link", label, target, line, node.file));
        
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
            content: "",
            scripts: {}
        },
        nodes: {},
        sections: {}
    };
    
    lines.forEach(function (line, lineOffset) {
        
        var currentLineOffset = lineOffset - currentFileLineOffset - 1;
        
        if (isFileTag(line)) {
            currentFile = line.replace("<<<", "").replace(">>>", "");
            currentFileLineOffset = lineOffset;
        }
        else if (!currentNode) {
            
            if (isTitle(line)) {
                ast.meta.title = line.replace(/^#/, "").trim();
            }
            else if (isSectionTitle(line)) {
                setSection(line, currentLineOffset);
            }
            else if (isNodeTitle(line)) {
                addNode(line, currentLineOffset);
            }
            else if (section && isProperty(line)) {
                parseProperty(line, currentLineOffset, true);
                ast.sections[section].content += "\n";
            }
            else if (section) {
                ast.sections[section].content += line + "\n";
            }
            else if (!foundFirstSection) {
                
                if (!ast.head.line) {
                    ast.head.line = currentLineOffset;
                    ast.head.file = currentFile;
                }
                
                ast.head.content += line + "\n";
            }
        }
        else if (isSectionTitle(line)) {
            setSection(line, currentLineOffset);
            foundFirstSection = true;
            currentNode = null;
        }
        else if (isNodeTitle(line)) {
            addNode(line, currentLineOffset);
        }
        else if (isNodeSeparator(line)) {
            addAnonymousNode(line, currentLineOffset);
        }
        else if (isNextCommand(line)) {
            parseNextCommand(line, currentLineOffset);
            currentNode.content += "\n";
        }
        else if (isReturnToLast(line)) {
            parseReturnToLast(line, currentLineOffset);
            currentNode.content += "\n";
        }
        else if (isOption(line)) {
            parseOption(line, currentLineOffset);
            currentNode.content += "\n";
        }
        else if (isProperty(line)) {
            parseProperty(line, currentLineOffset);
            currentNode.content += "\n";
        }
        else {
            currentNode.content += line + "\n";
        }
    });
    
    parseSectionScripts();
    parseHead();
    
    return ast;
    
    function parseSectionScripts() {
        Object.keys(ast.sections).forEach(function (key) {
            parseScripts(ast.sections[key], ast.sections[key].content);
        });
    }
    
    function parseHead() {
        
        var head = clone(ast.head);
        
        parseScripts(head, ast.head.content);
        
        ast.head.scripts = clone(head.scripts);
        
        parseHierarchy();
    }
    
    function parseHierarchy() {
        
        var hierarchy = {};
        
        if (!ast.head.content) {
            ast.head.hierarchy = hierarchy;
            return;
        }
        
        ast.head.content.replace(hierarchyPattern, function (match, body) {
            
            var line = countNewLines(ast.head.content.split(match[0])[0]) + ast.head.line + 1;
            
            try {
                hierarchy = JSON.parse(body);
            }
            catch (error) {
                handleError(createError({
                    id: "HIERARCHY_JSON_ERROR"
                }));
            }
            
            return (new Array(line - ast.head.line - 1)).join("\n");
        });
        
        ast.head.hierarchy = hierarchy;
    }
    
    function setSection(line, lineOffset) {
        
        section = line.replace(/^##/, "").trim();
        
        if (!ast.sections[section]) {
            ast.sections[section] = {
                content: "",
                data: {},
                scripts: {},
                file: currentFile,
                line: lineOffset + 1
            };
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
                file: currentNode.file,
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
                file: currentNode.file,
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
        
        currentNode.options.push(
            option(label, target, value, condition, lineOffset, currentNode.file)
        );
    }
    
    function parseProperty(line, lineOffset, isSection) {
        
        var currentSection;
        var rawKey = line.split(":")[0];
        var value = line.split(rawKey + ":")[1];
        var key = rawKey.replace(/^\(#\)/, "").trim();
        
        if (isSection) {
            
            currentSection = ast.sections[section];
            
            try {
                currentSection.data[key] = JSON.parse(value);
            }
            catch (error) {
                handleError(createError({
                    id: "INVALID_JSON_IN_SECTION_PROPERTY",
                    section: section,
                    sectionLine: currentSection.line,
                    sectionFile: currentSection.file,
                    property: key,
                    errorMessage: error.message
                }));
            }
        }
        else {
            try {
                currentNode.data[key] = JSON.parse(value);
            }
            catch (error) {
                handleError(createError({
                    id: "INVALID_JSON_IN_NODE_PROPERTY",
                    nodeId: currentNode.id,
                    nodeLine: currentNode.line,
                    nodeFile: currentNode.file,
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
    
    var id = line.replace(/^###/, "").trim();
    
    return {
        id: id,
        section: section,
        line: lineOffset + 1,
        file: currentFile,
        content: "",
        links: [],
        scripts: {},
        options: [],
        data: {
            node: id,
            tags: [],
            flags: [],
            contains: [],
            wasIn: []
        }
    };
}

function option(label, target, value, condition, lineOffset, file) {
    return {
        type: "option",
        value: value,
        line: lineOffset + 1,
        file: file,
        label: label,
        target: target,
        condition: condition
    };
}

function link(type, label, target, line, file) {
    return {
        type: type,
        label: label,
        target: target,
        file: file,
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

function isFileTag(line) {
    return (/^<<<[^>]+>>>$/).test(line);
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
