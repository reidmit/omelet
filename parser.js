"use strict";

var Parsimmon = require('./parsimmon.js');
var nodes = require('./ast.js');
var errors = require('./errors.js');
var evaluators = require('./evaluators.js');

var regex = Parsimmon.regex;
var string = Parsimmon.string;
var optWhitespace = Parsimmon.optWhitespace;
var lazy = Parsimmon.lazy;
var seq = Parsimmon.seq;
var eof = Parsimmon.eof;

function lexeme(p) { return p.skip(optWhitespace); }

//Not included in AST
var lparen      = lexeme(string('('));
var rparen      = lexeme(string(')'));
var doublecolon = lexeme(string('::'));
var pipe        = lexeme(string('|'));
var quote       = lexeme(string("'"));
var assignment  = lexeme(string("="));
var dot         = lexeme(string("."));
var hash        = lexeme(string("#"));
var singlecolon = lexeme(string(":"));

//Translated into AST nodes
var number = lexeme(regex(/[0-9]+/).map(parseInt).toNode(nodes.Number));

var ident = lexeme(regex(/[a-z][a-zA-Z0-9_-]*/i).toNode(nodes.Identifier));

var unquotedstring = lexeme(regex(/[^\n\)\|\'\(]+/).toNode(nodes.String));
var quotedstring = quote.then(lexeme(regex(/[^\']*/))).skip(quote).toNode(nodes.String);
var optquotedstring = unquotedstring.or(quotedstring);

var comment = lexeme(regex(/\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\//)).toNode(nodes.Comment);

var expr = lazy('an s-expression', function() { return tag.or(atom) });

var atom = number.or(comment).or(unquotedstring);

var basic_attribute = seq(ident.skip(assignment),quotedstring).toAttributeNode();
var class_attribute = dot.then(ident).toAttributeNode({name: "class"});
var id_attribute    = hash.then(ident).toAttributeNode({name: "id"});
var attribute       = basic_attribute.or(class_attribute).or(id_attribute);

var filter_param  = number.or(quotedstring).or(ident);
var filter        = seq(pipe.then(ident),filter_param.many()).toNode(nodes.Filter);

var tag = seq(
    lparen.then(ident),
    attribute.many(),
    doublecolon.then(expr.many()),
    filter.many().skip(rparen)
    ).toTagNode();

var OmeletParser = expr.many();

var originalCode;
function parse(input) {
    originalCode = input;
    return OmeletParser.parse(input);
}

module.exports.parse = parse;
module.exports.nodes = nodes;

module.exports.filter = filter;
