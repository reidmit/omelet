"use strict";

var Parsimmon = require('./parsimmon.js');
var nodes = require('./ast.js');
var errors = require('./errors.js');
var evaluators = require('./evaluators.js');
var indentation = require('./indentation.js');

var regex = Parsimmon.regex;
var string = Parsimmon.string;
var optWhitespace = Parsimmon.optWhitespace;
var succeed = Parsimmon.succeed;
var lazy = Parsimmon.lazy;
var seq = Parsimmon.seq;
var alt = Parsimmon.alt;
var eof = Parsimmon.eof;
var any = Parsimmon.any;
var sepBy = Parsimmon.sepBy;
var takeWhile = Parsimmon.takeWhile;
var _ = Parsimmon.optWhitespace;

function opt(p) { return p.atMost(1); }
function lexeme(p) { return p.skip(optWhitespace); }

var parsers = {};

parsers.html = function() {
    return require('./parsers/html.js');
}

parsers.omelet = function() {
    return require('./parsers/omelet.js');
}

parsers.omelet2 = function() {

    var LPAREN      = lexeme(string('(')).toNode(nodes.Symbol);
    var RPAREN      = string(')').toNode(nodes.Symbol);
    var LBRACE      = lexeme(string("{"));
    var RBRACE      = string("}");
    var LBRACKET    = lexeme(string("["));
    var RBRACKET    = lexeme(string("]"));
    var doublecolon = string('::');
    var pipe        = lexeme(string('|'));
    var QUOTE1      = regex(/\'/);
    var QUOTE2      = regex(/\"/);
    var EQUALSIGN   = lexeme(string("="));
    var dot         = lexeme(string("."));
    var hash        = lexeme(string("#"));
    var singlecolon = lexeme(string(":"));
    var EXCLAM      = lexeme(string("!"));
    var COMMA       = lexeme(string(","));
    var DOLLAR      = lexeme(string("$"));
    var BOOLEAN     = lexeme(string("true").or(string("false"))).toNode(nodes.Boolean);
    var _           = optWhitespace;

    var NUMBER = lexeme(regex(/[0-9]+/).map(parseInt).toNode(nodes.Number));

    var idx = 0;
    var mode;
    var RAW = seq(string("<!"), takeWhile(function(c) {
            if (c==="'" || c==="\"") {
                if (!mode) {
                    mode = c;
                } else {
                    if (mode === c)
                        mode = undefined;
                    return true;
                }
            }
            if (mode) return true;

            if (idx===0 && c==="!")
                idx++;
            else if (idx===1 && c===">")
                idx++;
            else
                idx = 0;
            return idx !== 2;
        }), string(">")).toNode(nodes.Raw, function(s,v,e) {
        return { value: v[1].substring(0,v[1].length-1) };
    });

    var IDENT = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/).toNode(nodes.Identifier));
    var MODIFIER = alt( seq(dot,IDENT), seq(LBRACKET,NUMBER,RBRACKET) )
                        .toNode(nodes.Modifier, function(start,value,end) {
                            return { value: value[1] }
                        });

    var IDENT_COMPLEX = seq(IDENT, MODIFIER.atLeast(1) )
                            .toNode(nodes.Identifier, function(start,value,end) {
                                return {
                                    value: value[0].value,
                                    modifiers: value[1]
                                }
                            });

    var ATTRIBUTE_NAME = lexeme(regex(/[a-zA-Z][a-zA-Z0-9-]*/)).toNode(nodes.String);


    var VARIABLE_NAME = lexeme(regex(/\$[a-z][a-zA-Z0-9_-]*/i).toNode(nodes.Identifier));

    var ESCAPED_CHAR = alt(lexeme(string("\\(")), lexeme(string("\\|")), lexeme(string("\\\"")))
                        .map(function(s) { return s.slice(1) });

    var unquotedstring = regex(/[^\)\|\(\{\\]+/).toNode(nodes.String);

    var quotedstring = alt(seq(QUOTE1, regex(/[^\']*/), QUOTE1),
                           seq(QUOTE2, regex(/[^\"]*/), QUOTE2)).toNode(nodes.String, function(start,value,end) {
            return { value: value[1] };
        });

    var COMMENT = lexeme(regex(/\(\*\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\)/)).toNode(nodes.Comment);

    var expr = lazy('an Omelet expression', function() {
                    return alt(RAW,DOCTYPE,COMMENT,INCLUDE,IF_STATEMENT,FOR_LOOP,tag,parenthetical,atom);
                });

    var FILTER_PARAM  = alt(NUMBER, quotedstring, IDENT);

    var FILTER = seq(pipe.then(IDENT), FILTER_PARAM.many())
                    .toNode(nodes.Filter, function(start,value,end) {
                        return {
                            name: value[0],
                            arguments: value[1]
                        }
                    });

    var MACRO_ARGUMENT = (_).then(alt(NUMBER, BOOLEAN, quotedstring, IDENT));

    var INTERPOLATION = seq(LBRACE, alt(IDENT_COMPLEX,IDENT), MACRO_ARGUMENT.many(), FILTER.many(), RBRACE)
                            .toNode(nodes.Interpolation, function(start,value,end) {
                                return {
                                    name: value[1],
                                    arguments: value[2],
                                    filters: value[3]
                                }
                            });

    var CSS_VALID_ID = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/).toNode(nodes.String));

    var basic_attribute = seq(ATTRIBUTE_NAME.skip(EQUALSIGN),alt(quotedstring,INTERPOLATION))
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return { name: value[0],
                                         value: value[1] }
                            });
    var class_attribute = dot.then(CSS_VALID_ID)
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return { name: new nodes.String({start: start, value: "class", end: end}),
                                         value: value }
                            });
    var id_attribute    = hash.then(CSS_VALID_ID)
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return { name: new nodes.String({start: start, value: "id", end: end}),
                                         value: value }
                            });

    var attribute       = lexeme(alt(basic_attribute, class_attribute, id_attribute));

    module.exports.attr = attribute;

    var atom = alt(NUMBER, INTERPOLATION, unquotedstring);

    var TAG_NAME = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/)).toNode(nodes.String);
    var tag = (_).then(seq(LPAREN.then(TAG_NAME),attribute.many(),doublecolon.then(expr.many()),FILTER.many().skip(RPAREN)))
                .toNode(nodes.Tag, function(start,value,end) {
                    return {
                        name: value[0],
                        attributes: evaluators.mergeAttributes(value[1],"class"),
                        inner: value[2],
                        filters: value[3]
                    }
                });

    var parenthetical = seq(LPAREN.then(expr.atLeast(1)),FILTER.many().skip(RPAREN))
                            .toNode(nodes.Parenthetical, function(start,value,end) {
                                return {
                                    inner: value[0],
                                    filters: value[1]
                                }
                            });

    var ARRAY = seq(LBRACKET, sepBy(alt(NUMBER,BOOLEAN,quotedstring,tag),COMMA), RBRACKET)
                    .toNode(nodes.Array, function(start,value,end) {
                        return {
                            values: value[1]
                        }
                    })

    var DEF = lexeme(string("def"));
    var ASSIGNMENT = (_).then(seq(DEF, IDENT, EQUALSIGN, alt(ARRAY, NUMBER, BOOLEAN, quotedstring, tag, parenthetical), _))
                        .toNode(nodes.Assignment, function(start,value,end) {
                            return {
                                leftSide: value[1],
                                rightSide: value[3]
                            }
                        });

    var MACRO_DEFINITION = (_).then(seq(DEF.then(IDENT),IDENT.many().skip(EQUALSIGN),expr))
                        .toNode(nodes.MacroDefinition, function(start,value,end) {
                            return {
                                name: value[0],
                                params: value[1],
                                body: value[2]
                            }
                        });

    var FILE_PATH = regex(/[^\s\)]+/);

    var INCLUDE = seq(LPAREN, string("include"), _, FILE_PATH, _, RPAREN)
                    .toNode(nodes.Include, function(start,value,end) {
                        return {
                            file: value[3]
                        }
                    });

    var IMPORT = seq(string("import"), _, FILE_PATH, _)
                    .toNode(nodes.Import, function(start,value,end) {
                        return {
                            file: value[2]
                        }
                    });

    var EXTEND = seq(string("extend"), _, FILE_PATH, _)
                    .toNode(nodes.Extend, function(start,value,end) {
                        return {
                            file: value[2]
                        }
                    });

    var DEFINITION = alt(ASSIGNMENT, MACRO_DEFINITION);

    var DOCTYPE = seq( LPAREN, string("doctype"), _, regex(/[^\)\s]+/), RPAREN)
                    .toNode(nodes.Doctype, function(start,value,end) {
                        return { value: value[3] };
                    });

                    //TODO: comments here are not put into AST
    var DOCUMENT = seq( _, COMMENT.many(), EXTEND.atMost(1), _, IMPORT.many(), _, DEFINITION.many(), _, expr.many() )
                        .toNode(nodes.Document, function(start,value,end) {
                            return {
                                extend: value[2][0],
                                imports: value[4],
                                contents: value[6].concat(value[8])
                            }
                        });


    //Boolean expressions
    var AND = lexeme(string("&&"));
    var OR = lexeme(string("||"));
    var NOT = lexeme(string("!"));
    var BOOLEAN_ID = BOOLEAN.or(parenthetical).or(INTERPOLATION).skip(_);
    var BOOLEAN_FACTOR =
        BOOLEAN_ID
            .or(
        seq(NOT,BOOLEAN_FACTOR).toNode(nodes.BooleanOperator, function(start,value,end) {
            return {
                op: value[0],
                right: value[1]
            }
        })
            ).or(
        seq(LPAREN,BOOLEAN_EXPR,RPAREN).toNode(nodes.BooleanExpression, function(start,value,end) {
            return {
                value: value[1]
            }
        })
            );
    var BOOLEAN_TERM = seq(BOOLEAN_FACTOR,seq(AND,BOOLEAN_FACTOR).many());
    var BOOLEAN_EXPR = seq(BOOLEAN_TERM,seq(OR,BOOLEAN_TERM).many()).toNode(nodes.BooleanExpression);

    var IF = lexeme(string("if"));
    var ELIF = lexeme(string("elif"));
    var ELSE = lexeme(string("else"));
    var ELSE_STATEMENT = (_).then(seq(LPAREN.then(ELSE), doublecolon, expr.many(), RPAREN));
    var ELIF_STATEMENT = (_).then(seq(
            LPAREN.then(ELIF), BOOLEAN_ID, doublecolon, expr.many(), RPAREN
        )).toNode(nodes.IfStatement, function(start,value,end) {
            return {
                predicate: value[1],
                thenCase: value[3]
            }
        });
    var IF_STATEMENT = (_).then(seq(
            LPAREN.then(IF), BOOLEAN_ID, doublecolon, expr.many(), RPAREN,
            ELIF_STATEMENT.many(),
            ELSE_STATEMENT.atMost(1)
        )).toNode(nodes.IfStatement, function(start,value,end) {
            return {
                predicate: value[1],
                thenCase: value[3],
                elifCases: value[5],
                elseCase: value[6][0] ? value[6][0][2] : undefined,
            }
        });

    var FOR = lexeme(string("for"));
    var IN = lexeme(string("in"));
    var FOR_LOOP = (_).then(seq(LPAREN, FOR, IDENT, IN, IDENT, doublecolon, expr.many(), RPAREN))
                    .toNode(nodes.ForEach, function(start,value,end) {
                        return {
                            iterator: value[2],
                            data: value[4],
                            body: value[6]
                        }
                    });

    return DOCUMENT;
}

//ARITHMETIC EXPRESSIONS (shunting-yard algo)
//todo: comparison ops, ==, !=, >, ...
// var ARITH_OP = lexeme(regex(/\+|\-|\*|\/|\^/))
//                     .toNode(nodes.Operator, function(start,value,end) {
//                         var precedence_map = {"+":1,"-":1,"*":2,"/":2,"^":3}
//                         var associativity_map = {"+":"L","-":"L","*":"L","/":"L","^":"R"}
//                         return {
//                             value: value,
//                             precedence: precedence_map[value],
//                             associativity: associativity_map[value]
//                         }
//                     });
// var ARITH_EXPR = NUMBER.or(LPAREN).or(RPAREN).or(ARITH_OP).atLeast(1)
//                     .toNode(nodes.ArithExpr, function(start,value,end) {
//                         //First, use the Shunting-Yard algorithm to
//                         //rearrange the nodes into reverse Polish notation
//                         var postfix = [];
//                         var stack = [];
//                         for (var i=0; i<value.length; i++) {
//                             if (value[i].value == "(") {
//                                 stack.push(value[i]);
//                             } else if (value[i].value == ")") {
//                                 while (stack[stack.length-1].value != "(") {
//                                     postfix.push(stack.pop());
//                                 }
//                                 stack.pop();
//                             } else if (value[i].kind == "Operator") {
//                                 var o1, o2;
//                                 o1 = value[i];
//                                 if (stack.length > 0)   {
//                                     o2 = stack[stack.length-1];
//                                     while ((o2.kind == "Operator") &&
//                                            (  ((o1.associativity == "L") && (o1.precedence <= o2.precedence))
//                                            || ((o1.associativity == "R") && (o1.precedence < o2.precedence)) )) {
//                                         postfix.push(o2);
//                                         stack.pop();
//                                         if (stack.length==0) break;
//                                         o2 = stack[stack.length-1];
//                                     }
//                                 }
//                                 stack.push(o1);
//                             } else {
//                                 postfix.push(value[i]);
//                             }
//                         }
//                         while (stack.length > 0) {
//                             postfix.push(stack.pop());
//                         }

//                         //Now, turn the RPN into a tree

//                         stack = [];
//                         postfix.reverse();

//                         stack.push(postfix.pop());
//                         while (postfix.length > 0) {
//                             switch(postfix[postfix.length-1].kind) {
//                                 case "Operator":
//                                     var e1 = stack.pop();
//                                     var e2 = stack.pop();
//                                     stack.push(new nodes.Operator({
//                                         value: postfix.pop(),
//                                         left: e2,
//                                         right: e1
//                                     }))
//                                     break;
//                                 default:
//                                     stack.push(postfix.pop());
//                                     break;
//                             }
//                         }

//                         return {
//                             value: stack
//                         }
//                     });


//end simple stuff, begin experimental stuff

// var LBRACE = lexeme(string("["));
// var RBRACE = lexeme(string("]"));
// var DOTS   = lexeme(string(".."));

// var RANGE = LBRACE.then(seq(NUMBER.or(IDENT).skip(DOTS),NUMBER.or(IDENT))).skip(RBRACE)
//                 .toNode(nodes.Range, function(start,value,end) {
//                     return {
//                         range_begin: value[0],
//                         range_end: value[1]
//                     }
//                 });


module.exports.html   = parsers.html();
module.exports.omelet = parsers.omelet();
