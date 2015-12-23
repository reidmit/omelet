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

var unquotedstring = lexeme(regex(/[^\n\)\|\(]+/).toNode(nodes.String));
var quotedstring = quote.then(lexeme(regex(/[^\']*/))).skip(quote).toNode(nodes.String);
var optquotedstring = unquotedstring.or(quotedstring);

var comment = lexeme(regex(/\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\//)).toNode(nodes.Comment);

var expr = lazy('an s-expression', function() { return comment.or(tag).or(atom) });

var atom = number.or(unquotedstring);

var basic_attribute = seq(ident.skip(assignment),quotedstring)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return {
                                name: value[0],
                                value: value[1]
                            }
                        });
var class_attribute = dot.then(ident)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return {
                                name: new nodes.Identifier({start: start, value: "class", end: end}),
                                value: value
                            }
                        });
var id_attribute    = hash.then(ident)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return {
                                name: new nodes.Identifier({start: start, value: "id", end: end}),
                                value: value
                            }
                        });
var attribute       = basic_attribute.or(class_attribute).or(id_attribute);

var filter_param  = number.or(quotedstring).or(ident);
var filter        = seq(pipe.then(ident),filter_param.many()).toNode(nodes.Filter);

var tag = seq(lparen.then(ident),attribute.many(),doublecolon.then(expr.many()),filter.many().skip(rparen))
            .toNode(nodes.Tag, function(start,value,end) {
                return {
                    name: value[0],
                    attributes: evaluators.mergeAttributes(value[1],"class"),
                    inner: value[2],
                    filters: value[3]
                }
            });

var OmeletParser = expr.many();

//end simple stuff, begin experimental stuff

var LBRACE = lexeme(string("["));
var RBRACE = lexeme(string("]"));
var DOTS   = lexeme(string(".."));

var RANGE = LBRACE.then(seq(number.or(ident).skip(DOTS),number.or(ident))).skip(RBRACE)
                .toNode(nodes.Range, function(start,value,end) {
                    return {
                        range_begin: value[0],
                        range_end: value[1]
                    }
                });


var originalCode;
function parse(input) {
    originalCode = input;
    return OmeletParser.parse(input);
}

module.exports.parse = parse;
module.exports.nodes = nodes;

module.exports.RANGE = RANGE;
