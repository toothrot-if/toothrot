
var errors = {
    
    NO_TITLE: "No story title specified!",
    NO_START_NODE: "Required node 'start' is missing.",
    
    UNKNOWN_NEXT_NODE: "Unknown next node '{next}' for node '{nodeId}' (line {nodeLine}).",
    
    CONFLICT_NEXT_RETURN: "Conflict: Node '{nodeId}' (line {nodeLine}) has both a next node and " +
        "a return to the last node.",
    
    OPTION_WITHOUT_TARGET_OR_VALUE: "Option must have at least one of 'target' or 'value' in " +
        "node '{nodeId}' (line {nodeLine}). @{optionLine}",
    
    UNKNOWN_OPTION_TARGET: "Unknown node '{target}' referenced in option '{label}' in node " +
        "'{nodeId}' (line {nodeLine}). @{optionLine}",
    
    NO_LINK_TARGET: "No link target specified for link '{label}' in node '{nodeId}' " +
        "(line {nodeLine}). @{linkLine}",
    
    UNKNOWN_LINK_TARGET: "No such link target '{target}' for link '{label}' in node '{nodeId}' " +
        "(line {nodeLine}). @{linkLine}",
    
    NO_OBJECT_LINK_TARGETS: "No link targets specified for link '{label}' in node '{nodeId}' " +
        "(line {nodeLine}). @{linkLine}",
    
    MALFORMED_LINK: "Malformed node link in node '{nodeId}' (line {nodeLine}).",
    
    MALFORMED_OBJECT_LINK: "Malformed object link in node '{nodeId}' (line {nodeLine}).",
    
    INVALID_JSON_IN_OBJECT_LINK: "Object link in node '{nodeId}' (line {nodeLine}) cannot be " +
        "parsed: {errorMessage}",
    
    MULTIPLE_NEXT_NODES: "Node '{nodeId}' (line {nodeLine}) cannot have more than one next node. " +
        "@{lineOffset}",
    
    MALFORMED_OPTION: "Malformed option in node '{nodeId}' (line {nodeLine}). @{lineOffset}",
    
    INVALID_JSON_IN_SECTION_PROPERTY: "Cannot parse property '{property}' in section '{section}' " +
        "(line {sectionLine}): {errorMessage} @{lineOffset}",
    
    INVALID_JSON_IN_NODE_PROPERTY: "Cannot parse property '{property}' in node '{nodeId}' " +
        "(line {nodeLine}): {errorMessage} @{lineOffset}"
};

module.exports = errors;
