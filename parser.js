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
var LPAREN      = lexeme(string('('));
var RPAREN      = lexeme(string(')'));
var doublecolon = lexeme(string('::'));
var pipe        = lexeme(string('|'));
var quote       = lexeme(string("'"));
var EQUALSIGN   = lexeme(string("="));
var dot         = lexeme(string("."));
var hash        = lexeme(string("#"));
var singlecolon = lexeme(string(":"));
var DOLLAR      = lexeme(string("$"));
var BOOLEAN     = lexeme(string("true").or(string("false")));

//Translated into AST nodes
var NUMBER = lexeme(regex(/[0-9]+/).map(parseInt).toNode(nodes.Number));

var IDENT = lexeme(regex(/[a-z][a-zA-Z0-9_-]*/i).toNode(nodes.Identifier));
var VARIABLE_NAME = lexeme(regex(/\$[a-z][a-zA-Z0-9_-]*/i).toNode(nodes.Identifier));

var unquotedstring = lexeme(regex(/[^\n\)\|\(\$]+/).toNode(nodes.String));
var quotedstring = quote.then(lexeme(regex(/[^\']*/))).skip(quote).toNode(nodes.String);
var optquotedstring = unquotedstring.or(quotedstring);

var comment = lexeme(regex(/\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\//)).toNode(nodes.Comment);

var expr = lazy('an Omelet expression', function() {
                return comment.or(tag).or(parenthetical).or(ASSIGNMENT).or(atom)
            });

var atom = NUMBER.or(VARIABLE_NAME).or(unquotedstring);

var basic_attribute = seq(IDENT.skip(EQUALSIGN),quotedstring)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: value[0],
                                     value: value[1] }
                        });
var class_attribute = dot.then(IDENT)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: new nodes.Identifier({start: start, value: "class", end: end}),
                                     value: value }
                        });
var id_attribute    = hash.then(IDENT)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: new nodes.Identifier({start: start, value: "id", end: end}),
                                     value: value }
                        });
var attribute       = basic_attribute.or(class_attribute).or(id_attribute);

var filter_param  = NUMBER.or(quotedstring).or(IDENT);
var filter        = seq(pipe.then(IDENT),filter_param.many()).toNode(nodes.Filter);

var tag = seq(LPAREN.then(IDENT),attribute.many(),doublecolon.then(expr.many()),filter.many().skip(RPAREN))
            .toNode(nodes.Tag, function(start,value,end) {
                return {
                    name: value[0],
                    attributes: evaluators.mergeAttributes(value[1],"class"),
                    inner: value[2],
                    filters: value[3]
                }
            });

var parenthetical = seq(LPAREN.then(expr.atLeast(1)),filter.atLeast(1).skip(RPAREN))
                        .toNode(nodes.Parenthetical, function(start,value,end) {
                            return {
                                inner: value[0],
                                filters: value[1]
                            }
                        });

var ASSIGNMENT = seq(VARIABLE_NAME.skip(EQUALSIGN),quotedstring.or(NUMBER).or(BOOLEAN))
                    .toNode(nodes.Assignment, function(start,value,end) {
                        return {
                            left_side: value[0],
                            right_side: value[1]
                        }
                    });

var OmeletParser = expr.many();

//end simple stuff, begin experimental stuff

var LBRACE = lexeme(string("["));
var RBRACE = lexeme(string("]"));
var DOTS   = lexeme(string(".."));

var RANGE = LBRACE.then(seq(NUMBER.or(IDENT).skip(DOTS),NUMBER.or(IDENT))).skip(RBRACE)
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

//to be deleted
module.exports.ass = ASSIGNMENT;