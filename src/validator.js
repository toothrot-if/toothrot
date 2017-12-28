
var each = require("enjoy-core/each");
var createError = require("./utils/createError");

function validator(handleError) {
    
    var validateNodes = each(validateNode);
    
    function validateAst(ast) {
        
        if (!ast.meta.title) {
            handleError(createError({id: "NO_TITLE"}));
        }
        
        if (!ast.nodes.start) {
            handleError(createError({id: "NO_START_NODE"}));
        }
        
        validateHierarchy(ast.head.hierarchy);
        validateNodes(ast.nodes);
    }
    
    function validateHierarchy(hierarchy) {
        
        try {
            Object.keys(hierarchy).forEach(function (tag) {
                resolveHierarchy(tag, hierarchy);
            });
        }
        catch (tag) {
            handleError(createError({
                id: "CIRCULAR_HIERARCHY",
                tag: tag
            }));
        }
    }
    
    function resolveHierarchy(tag, hierarchy, resolving) {
        
        var tags = [];
        var ancestors = hierarchy[tag];
        
        resolving = resolving || [];
        
        resolving.push(tag);
        
        ancestors.forEach(function (ancestor) {
            
            if (resolving.indexOf(ancestor) >= 0) {
                throw tag;
            }
            
            resolveHierarchy(ancestor, hierarchy, resolving).forEach(function (otherTag) {
                tags.push(otherTag);
            });
            
        });
        
        resolving.splice(resolving.indexOf(tag), 1);
        
        return tags;
    }
    
    function validateNode(node, name, nodes) {
        
        if (node.next && !nodes[node.next]) {
            handleError(createError({
                id: "UNKNOWN_NEXT_NODE",
                next: node.next,
                nodeLine: node.line,
                nodeFile: node.file,
                nodeId: node.id
            }));
        }
        
        if (node.data.autonextTarget && !nodes[node.data.autonextTarget]) {
            handleError(createError({
                id: "UNKNOWN_AUTONEXT_TARGET",
                target: node.data.autonextTarget,
                nodeLine: node.line,
                nodeFile: node.file,
                nodeId: node.id
            }));
        }
        
        if (node.next && node.returnToLast) {
            handleError(createError({
                id: "CONFLICT_NEXT_RETURN",
                nodeId: node.id,
                nodeFile: node.file,
                nodeLine: node.line
            }));
        }
        
        if (node.data.autonext && !node.returnToLast && !node.next && !node.data.autonextTarget) {
            handleError(createError({
                id: "NO_AUTONEXT_TARGET",
                nodeId: node.id,
                nodeFile: node.file,
                nodeLine: node.line
            }));
        }
        
        validateOptions(node, nodes);
        validateLinks(node, nodes);
    }
    
    function validateOptions(node, nodes) {
        
        var validateEach = each(function (option) {
            validateOption(option, node, nodes);
        });
        
        if (Array.isArray(node.options)) {
            validateEach(node.options);
        }
    }
    
    function validateOption(option, node, nodes) {
        
        if (!option.target && !option.value) {
            handleError(createError({
                id: "OPTION_WITHOUT_TARGET_OR_VALUE",
                nodeId: node.id,
                nodeLine: node.line,
                nodeFile: node.file,
                optionFile: option.file,
                optionLine: option.line
            }));
        }
        
        if (option.target && !nodes[option.target]) {
            handleError(createError({
                id: "UNKNOWN_OPTION_TARGET",
                nodeId: node.id,
                target: option.target,
                label: option.label,
                nodeLine: node.line,
                nodeFile: node.file,
                optionFile: option.file,
                optionLine: option.line
            }));
        }
    }
    
    function validateLinks(node, nodes) {
        
        var validateEach = each(function (link) {
            validateLink(link, node, nodes);
        });
        
        validateEach(node.links);
    }
    
    function validateLink(link, node, nodes) {
        if (link.type === "direct_link") {
            validateDirectLink(link, node, nodes);
        }
    }
    
    function validateDirectLink(link, node, nodes) {
        
        if (!link.target) {
            handleError(createError({
                id: "NO_LINK_TARGET",
                nodeId: node.id,
                nodeLine: node.line,
                file: node.file,
                linkLine: link.line,
                label: link.label
            }));
        }
        else if (!(link.target in nodes)) {
            handleError(createError({
                id: "UNKNOWN_LINK_TARGET",
                nodeId: node.id,
                nodeLine: node.line,
                file: node.file,
                linkLine: link.line,
                target: link.target,
                label: link.label
            }));
        }
    }
    
    return {
        validate: validateAst,
        validateNodes: validateNodes,
        validateNode: validateNode
    };
}

module.exports = validator;
