
function parse(args) {
    
    var result = {
        flags: {},
        args: [],
        execPath: args[0],
        program: args[1]
    };
    
    args.forEach(function (arg, i) {
        
        if (i < 2) {
            return;
        }
        
        if (isFlag(arg)) {
            result.flags[arg.split("--").pop()] = true;
        }
        else {
            result.args.push(arg);
        }
    });
    
    return result;
}

function isFlag(arg) {
    return (/^\-\-/).test(arg);
}

module.exports = {
    parse: parse
};
