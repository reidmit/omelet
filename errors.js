var __ = require('./util.js');

module.exports.EvalError = function(state, input) {
    var startIndex, endIndex, message,
        prefix, suffix, lookahead, lookbehind,
        lines, line, column;

    lookahead = lookbehind = 30;
    startIndex = state.index - lookbehind;
    endIndex = state.index + lookahead;
    startIndex = startIndex > 0 ? startIndex : 0;
    endIndex = endIndex < input.length ? endIndex : input.length;
    prefix = startIndex === 0 ? "" : "...";
    suffix = endIndex === input.length ? "" : "...";

    lines = input.split("\n");
    column = state.index;
    for (var i=0; i<lines.length; i++) {
        if (column - lines[i].length > 0) {
            column -= lines[i].length;
        } else {
            line = i;
            break;
        }
    }

    message = state.msg + "\n"
            + "\nAt line "+line+", column "+column+" in input:\n"
            + "    "+prefix+input.substring(startIndex,endIndex)+suffix+"\n"
            + "    "+__.repeat(" ",(prefix.length ? prefix.length+lookbehind : state.index)) + "^";

    return "EvalError: "+message;
}


module.exports.TypeError = function(msg) {
    var rendered_msg = pe.render(new TypeError(msg));
    console.log(rendered_msg);
}


    //TODO: unify error parameters
    // probably {message:..., index:..., input:...} is all we need

module.exports.ParseError = function(state,input) {
    var startIndex, endIndex, message,
        prefix, suffix, lookahead, lookbehind,
        lines, line, column;

    lookahead = lookbehind = 30;
    startIndex = state.index - lookbehind;
    endIndex = state.index + lookahead;
    startIndex = startIndex > 0 ? startIndex : 0;
    endIndex = endIndex < input.length ? endIndex : input.length;
    prefix = startIndex === 0 ? "" : "...";
    suffix = endIndex === input.length ? "" : "...";

    lines = input.split("\n");
    column = state.index;
    for (var i=0; i<lines.length; i++) {
        if (column - lines[i].length > 0) {
            column -= lines[i].length;
        } else {
            line = i;
            break;
        }
    }

    input = input.replace(/\n/g, " ");

    message = state.msg + "\n"
            + "\nAt line "+line+", column "+column+" in input:\n"
            + "    "+prefix+input.substring(startIndex,endIndex)+suffix+"\n"
            + "    "+__.repeat(" ",(prefix.length ? prefix.length+lookbehind : state.index)) + "^";

    return "ParseError: "+message;
}

module.exports.SyntaxError = function(properties) {
    var startIndex, endIndex, message, prefix, suffix, lookahead, lookbehind;

    lookahead = lookbehind = 20;
    startIndex = properties.index - lookbehind;
    endIndex = properties.index + lookahead;
    startIndex = startIndex > 0 ? startIndex : 0;
    endIndex = endIndex < properties.input.length ? endIndex : properties.input.length;
    prefix = startIndex === 0 ? "" : "...";
    suffix = endIndex === properties.input.length ? "" : "...";

    message = properties.message+"\n"
            + "    "+prefix+properties.input.substring(startIndex,endIndex)+suffix+"\n"
            + "    "+__.repeat(" ",(prefix.length ? prefix.length+lookbehind : properties.index)) + "^";

    return console.error("SyntaxError:",message);
}

module.exports.AssertionError = function(properties) {
    return console.error("Assertion Failed:",properties.message)
}

