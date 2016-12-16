/* global require, module */

var enjoy = require("enjoy-js");
var each = enjoy.each;
var bind = enjoy.bind;
var parseMarkdown = require("marked");

function parseError (message) {
    
    message = "Toothrot Parser Error: " + message;
    
    return {
        message: message,
        isToothrotError: true,
        toothrotMessage: message
    };
}

function parse (text) {
    
    var ast;
    
    text = removeComments(text);
    ast = parseStructure(text);
    
    each(ast.nodes, bind(parseNodeContent, ast));
    
    validateAst(ast);
    
    return ast;
}

function validateAst (ast) {
    
    if (!ast.meta.title) {
        throw new Error("No story title specified!");
    }
    
    if (!ast.nodes.start) {
        throw new Error("Required node 'start' is missing.");
    }
    
    validateNodes(ast);
}

function validateNodes (ast) {
    
    each(ast.nodes, function (node) {
        
        if (node.next && !ast.nodes[node.next]) {
            throw parseError("Unknown next node '" + node.next + "' for node '" +
                node.id + "' (line " + node.line + ").");
        }
        
        if (node.next && node.returnToLast) {
            throw parseError("Conflict: Node '" + node.id + "' (line " + node.line +
                ") has both a next node and a return to the last node.");
        }
        
        if (Array.isArray(node.options)) {
            each(node.options, function (option) {
                
                if (!option.target && !option.value) {
                    throw parseError("Option must have at least one of 'target' or " +
                        "'value' in node '" + node.id + "' (line " + node.line +
                        "). @" + option.line);
                }
                
                if (option.target && !ast.nodes[option.target]) {
                    throw parseError("Unknown node '" + option.target +
                        "' referenced in option '" + option.label + "' in node '" +
                        node.id + "' (line " + node.line + "). @" + option.line);
                }
            });
        }
    });
}

function parseNodeContent (ast, node) {
    
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
            throw parseError("Malformed node link in node '" + node.id +
                " (line " + node.line + ")'.");
        }
        
        label = parts[0].trim();
        target = parts[1].trim();
        
        line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        if (!ast.nodes[target]) {
            throw parseError("Unknown node '" + target + "' referenced in link '" +
                label + "' in node '" + node.id + "' (line " + node.line +"). @" + line);
        }
        
        node.links.push(link("direct_link", label, target, line));
        
        return "(%l" + (node.links.length - 1) + "%)";
    });
    
    
    node.content = node.content.replace(/\(#((.|\n)*?)#\)/g, function (match, p1) {
        
        var parts = p1.split("=>");
        var label, targets, line;
        
        if (parts.length !== 2) {
            throw parseError("Malformed object link in node '" + node.id +
                " (line " + node.line + ")'.");
        }
        
        label = parts[0].trim();
        targets = parts[1].trim();
        line = countNewLines(oldContent.split(match)[0]) + node.line + 1;
        
        try {
            targets = JSON.parse(targets);
        }
        catch (error) {
            throw parseError("Object link in node '" + node.id + "' (line " +
                node.line + ") cannot be parsed: " + error.message);
        }
        
        each(targets, function (target) {
            if (!ast.nodes[target]) {
                throw parseError("Unknown node '" + target + "' referenced in link '" +
                    label + "' in node '" + node.id + "' (line " + node.line +"). @" +
                    line);
            }
        });
        
        node.links.push(link("object_link", label, targets, line));
        
        return "(%l" + (node.links.length - 1) + "%)";
    });
    
    node.content = node.content.split("\n").map(function (line) {
        
        if (isSilentLine(line)) {
            return "";
        }
        
        return line;
        
    }).join("\n");
    
    node.content = parseMarkdown(node.content);
}

function parseStructure (text) {
    
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
    
    function setSection (line) {
        
        section = line.replace(/^##:/, "").trim();
        
        if (!ast.sections[section]) {
            ast.sections[section] = {};
        }
        
    }
    
    function addNode (line, lineOffset) {
        subNodeOffset = 0;
        currentNode = node(line, lineOffset, section);
        parentNode = currentNode;
        ast.nodes[currentNode.id] = currentNode;
    }
    
    function addAnonymousNode (line, lineOffset) {
        
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
    
    function parseNextCommand (line, lineOffset) {
        
        var next = line.replace(/^\(>\)/, "").trim();
        
        if (currentNode.next) {
            throw parseError("Node '" + currentNode.id + "' (line " + currentNode.line +
                ") cannot have more than one next node. @" + lineOffset + 1);
        }
        
        currentNode.next = next;
    }
    
    function parseReturnToLast () {
        currentNode.returnToLast = true;
    }
    
    function parseOption (line, lineOffset) {
        
        var label, value, parts, valueParts, target;
        
        if (!Array.isArray(currentNode.options)) {
            currentNode.options = [];
        }
        
        line = line.replace(/^\(@\)/, "");
        parts = line.split("=>");
        
        if (parts.length !== 2) {
            throw parseError("Malformed option in node '" + currentNode.id +
                "' (line " + currentNode.line + "). @" + (lineOffset + 1));
        }
        
        valueParts = parts[1].split("|");
        label = parts[0].trim();
        target = valueParts[0].trim();
        
        value = (valueParts[1] ? valueParts[1].trim() : "");
        
        currentNode.options.push(option(label, target, value, lineOffset));
    }
    
    function parseProperty (line, lineOffset, isSection) {
        
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
                throw parseError("Cannot parse property '" + key + "' in section '" +
                    section + "' (line " + currentSection.line + "): " + error.message +
                    " @" + (lineOffset + 1));
            }
        }
        else {
            try {
                currentNode[key] = JSON.parse(value);
            }
            catch (error) {
                throw parseError("Cannot parse property '" + key + "' in node '" +
                    currentNode.id + "' (line " + currentNode.line + "): " + error.message +
                    " @" + (lineOffset + 1));
            }
        }
    }
}

function countNewLines (text) {
    return text.split("\n").length - 1;
}

function node (line, lineOffset, section) {
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

function option (label, target, value, lineOffset) {
    return {
        type: "option",
        value: value,
        line: lineOffset + 1,
        label: label,
        target: target
    };
}

function link (type, label, target, line) {
    return {
        type: type,
        label: label,
        target: target,
        line: line
    };
}

function isSilentLine (line) {
    return line.match(/^\(-\)/);
}

function isProperty (line) {
    return line.match(/^\(#\)/);
}

function isOption (line) {
    return line.match(/^\(\@\)/);
}

function isNextCommand (line) {
    return line.match(/^\(>\)/);
}

function isReturnToLast (line) {
    return line.match(/^\(<\)/);
}

function isNodeSeparator (line) {
    return line.match(/^\(~~~\)/);
}

function isTitle (line) {
    return line.match(/^#:/);
}

function isSectionTitle (line) {
    return line.match(/^##:/);
}

function isNodeTitle (line) {
    return line.match(/^###:/);
}

function removeComments (text) {
    return text.replace(/\(--.*?--\)/g, "");
}

module.exports = {
    parse: parse
};
