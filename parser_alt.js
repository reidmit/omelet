var Parsimmon = require('./parsimmon.js');
var nodes = require('./ast.js');
var errors = require('./errors.js');
var evaluators = require('./evaluators.js');
var parsers = {};

var regex = Parsimmon.regex;
var string = Parsimmon.string;
var optWhitespace = Parsimmon.optWhitespace;
var lazy = Parsimmon.lazy;
var seq = Parsimmon.seq;
var eof = Parsimmon.eof;

function lexeme(p) { return p.skip(optWhitespace); }

parsers.omelet = {};
//Base parsers
parsers.omelet["="] = lexeme(string("="));
parsers.omelet["|"] = lexeme(string('|'));
parsers.omelet["def"] = lexeme(string("def"));
parsers.omelet["identifier"] = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_]*/).toNode(nodes.Identifier));
parsers.omelet["number"] = lexeme(regex(/[0-9]+/).map(parseInt).toNode(nodes.Number));
parsers.omelet["filter_name"] = lexeme(regex(/[^\s0-9\|\)][^\s\)\|]*/)).toNode(nodes.Identifier);
    // "filter_param": parsers.omelet["number"],
parsers.omelet["filter"] = _p( "| filter_name number*", "Filter", function(start,value,end) {
        return { value: [value[1], value[2]] }
    });

parsers.omelet["assignment"] = _p("def identifier = expr", "Assignment", function(start,value,end) {
        return { left_side: value[1], right_side: value[3] }
    });

parsers.omelet["expr"] = parsers.omelet["number"]







//Takes in string representations of parser combinators, builds a parser out of them
//    e.g. "DEF IDENT EQUALSIGN expr"
function _p(signature,nodeName,nodeFunction) {
    var parts = signature.split(" ");
    var annotatedParts = [];
    for (var i=0; i<parts.length; i++) {
        var suffix;
        if (["?","*","+"].indexOf(parts[i].charAt(parts[i].length-1)) > -1) {
            suffix = parts[i].charAt(parts[i].length-1);
            parts[i] = parts[i].substring(0,parts[i].length-1);
        }
        var parser = parsers.omelet[parts[i]];
        if (suffix === "*") {
            parser = parser.many();
        } else if (suffix === "?") {
            parser = parser.atMost(1);
        } else if (suffix === "+") {
            parser = parser.atLeast(1);
        }
        annotatedParts.push(parser);
    }
    var parser = seq.apply(Parsimmon,annotatedParts);
    return parser.toNode(nodes[nodeName], nodeFunction);
}


module.exports = parsers;