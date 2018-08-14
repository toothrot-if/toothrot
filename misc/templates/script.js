    
    /**
     * {{$description}}
     * 
     * File: {{$file}}
     * Line: {{$line}}
     * 
     * @param {object} engine The engine runtime (a multiversum app)
     * @param {object} story The story object
     * @param {object} _ The function container
     * @param {object} $ The variable container
     * @param {function} write The `write` function for writing text to the output stream
     * @param {function} ln The `ln` function
     * @param {string} __file Name of the file that contains the script
     * @param {number} __line The line of the script in the story file
     * @returns {undefined} Return values are discarded
     */
    function {{$functionName}}(engine, story, _, $, write, ln, __file, __line) {
        {{$functionBody}}
    }
    
    {{$functionName}}.file = "{{$file}}";
    {{$functionName}}.line = {{$line}};
    
    scripts["{{$functionName}}"] = {{$functionName}};
    