
var errors = {
    
    NO_TITLE: "No story title specified!",
    NO_START_NODE: "Required node 'start' is missing.",
    
    SETTINGS_JSON_ERROR: "The settings section contains mal-formed JSON.",
    HIERARCHY_JSON_ERROR: "The hierarchy section contains mal-formed JSON.",
    
    CIRCULAR_HIERARCHY:
        "The hierarchy is circular. Tag '{tag}' references itself.",
    
    UNKNOWN_NEXT_NODE: "Unknown next node '{next}' for node '{nodeId}' (<{nodeFile}>@{nodeLine}).",
    
    UNKNOWN_AUTONEXT_TARGET: "Unknown autonextTarget '{target}' for node '{nodeId}' " +
        "(<{nodeFile}>@{nodeLine}).",
    
    CONFLICT_NEXT_RETURN: "Conflict: Node '{nodeId}' (<{nodeFile}>@{nodeLine}) has both a " +
        "next node and a return to the last node.",
    
    NO_AUTONEXT_TARGET: "Node '{nodeId}' (<{nodeFile}>@{nodeLine}) has an autonext property " +
        "but no autonextTarget, next node or return is specified.",
    
    OPTION_WITHOUT_TARGET_OR_VALUE: "Option must have at least one of 'target' or 'value' in " +
        "node '{nodeId}' (<{nodeFile}>@{nodeLine}). <{optionFile}>@{optionLine}",
    
    UNKNOWN_OPTION_TARGET: "Unknown node '{target}' referenced in option '{label}' in node " +
        "'{nodeId}' (<{nodeFile}>@{nodeLine}). <{optionFile}>@{optionLine}",
    
    NO_LINK_TARGET: "No link target specified for link '{label}' in node '{nodeId}' " +
        "(<{file}>@{nodeLine}). <{file}>@{linkLine}",
    
    UNKNOWN_LINK_TARGET: "No such link target '{target}' for link '{label}' in node '{nodeId}' " +
        "(<{file}>@{nodeLine}). <{file}>@{linkLine}",
    
    MULTIPLE_NEXT_NODES: "Node '{nodeId}' (<{file}>@{nodeLine}) cannot have more than one " +
        "next node. <{file}>@{lineOffset}",
    
    MALFORMED_OPTION: "Malformed option in node '{nodeId}' (<{file}>@{nodeLine}). " +
        "<{file}>@{lineOffset}",
    
    INVALID_JSON_IN_SECTION_PROPERTY: "Cannot parse property '{property}' in section '{section}' " +
        "(<{sectionFile}>@{sectionLine}): {errorMessage}",
    
    INVALID_JSON_IN_NODE_PROPERTY: "Cannot parse property '{property}' in node '{nodeId}' " +
        "(<{nodeFile}>@{nodeLine}): {errorMessage}"
};

module.exports = errors;
