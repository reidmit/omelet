var __ = require('./util.js');
// var PrettyError = require('pretty-error');
// var pe = new PrettyError();

var TypeError = function(msg) {
    var rendered_msg = pe.render(new TypeError(msg));
    console.log(rendered_msg);
}

var errorTypes = {

    //TODO: unify error parameters
    // probably {message:..., index:..., input:...} is all we need

    ParseError: function(parserState,input) {
        var startIndex, endIndex, message, prefix, suffix, lookahead, lookbehind;

        lookahead = lookbehind = 20;
        startIndex = parserState.index - lookbehind;
        endIndex = parserState.index + lookahead;
        startIndex = startIndex > 0 ? startIndex : 0;
        endIndex = endIndex < input.length ? endIndex : input.length;
        prefix = startIndex === 0 ? "" : "...";
        suffix = endIndex === input.length ? "" : "...";

        message = "Could not parse input.\n"
                + "    Expected one of the following:\n"
                + "        "+parserState.expected.join("\n        ")+"\n"
                + "    Got character '"+input.charAt(parserState.index)+"' in input:\n"
                + "        "+prefix+input.substring(startIndex,endIndex)+suffix+"\n"
                + "        "+__.repeat(" ",(prefix.length ? prefix.length+lookbehind : parserState.index)) + "^";

        return console.error("ParseError:",message);
    },

    SyntaxError: function(properties) {
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
    },

    AssertionError: function(properties) {
        return console.error("Assertion Failed:",properties.message)
    }
}
module.exports.TypeError = TypeError;
module.exports = errorTypes;