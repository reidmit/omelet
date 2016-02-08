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

function notChar(char) {
  return Parsimmon.custom(function(success, failure) {
    return function(stream, i) {
      if (stream.charAt(i) !== char && stream.length <= i) {
        return success(i+1, stream.charAt(i));
      }
      return failure(i, 'anything different than "' + char + '"');
    }
  });
}

function p(str) {

  var a = [], out = [], idxs = [];
  var curr = [];

  for(var i=0; i < str.length; i++){
      if(str.charAt(i) == '(') {
          out = out.concat(curr.join("").trim().split(" "));
          curr = [];
          a.push(i);
      } else if(str.charAt(i) == ')') {
          curr = [];
          if (a.length == 1) {
            out.push(str.substring(a.pop()+1,i));
            idxs.push(out.length-1);
          } else {
            a.pop();
          }
      } else {
        curr.push(str.charAt(i));
      }
  }
  if (curr.length > 0) {
    out = out.concat(curr.join("").trim().split(" "))
  }

  if (idxs.length === 0) {

    var s = str.split(" ");

    if (s.indexOf("|") === -1) {

      return "seq("+s.join(", ")+")";

    } else {

      s = s.filter(function(elt) {
        return elt !== "|";
      });

      return "alt("+s.join(", ")+")";

    }

  } else {
    for (var i=0; i<idxs.length; i++) {
      out[idxs[i]] = p(out[idxs[i]]);
    }
  }

  var out_s = out.join(", ");
  out_s = out_s.replace(/\*/g, ".many()")
               .replace(/\+/g, ".atLeast(1)")
               .replace(/\?/g, ".atMost(1)");

  return "seq("+out_s+")";
}

function notEscaped(char) {
  return Parsimmon.custom(function(success, failure) {
    return function(stream, i) {
      if (stream.charAt(i) === char && stream.charAt(i-1) !== "\\" && stream.length <= i) {
        return success(i+1, stream.charAt(i));
      }
      return failure(i, 'anything different than "' + char + '"');
    }
  });
}

/*
RULES FOR PARSERS:

1) No using "then" or "skip". Use "seq" instead.

2) No using "lexeme" so liberally. Use "WS" (optional whitespace) instead.

3) No using "or". Use "alt" instead.
*/

var parsers = {};

parsers.omelet2 = function() {
    var indentLevel = 0;

    var AT = string("@");
    var LBRACE = string("{");
    var RBRACE = string("}");
    var LPAREN = string("(");
    var RPAREN = string(")");
    var QUOTE1 = regex(/\'/);
    var QUOTE2 = regex(/\"/);
    var _ = optWhitespace;
    var _N_ = string("\n");

    var INDENT = string(indentation.indent_token);
    var DEDENT = string(indentation.dedent_token);

    var NUMBER = regex(/[0-9]+/).toNode(nodes.Number);

    var TAG_NAME = regex(/[a-zA-Z][a-zA-Z0-9_-]*/).toNode(nodes.String);

    var LINE_OF_TEXT = regex(/[^\n⇒⇐]+/).toNode(nodes.String);

    var expr = lazy('an Omelet2 expression', function() {
                    return alt(TAG, ATOM);
            });

    var ATOM = alt(LINE_OF_TEXT, NUMBER);

    var QUOTED_STRING = alt(seq(QUOTE1, regex(/[^\']*/), QUOTE1),
                            seq(QUOTE1, regex(/[^\"]*/), QUOTE2)).toNode(nodes.String, function(start,value,end) {
            return { value: value[1] };
        });



    var CSS_VALID_ID = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/).toNode(nodes.String));
    var ATTRIBUTE_NAME = regex(/[a-zA-Z][a-zA-Z0-9-]*/).toNode(nodes.String);

    var BASIC_ATTRIBUTE = seq(ATTRIBUTE_NAME,_,string("="),_,QUOTED_STRING,_)
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return {
                                    name: value[0],
                                    value: value[4]
                                }
                            });
    var CLASS_ATTRIBUTE = seq(string("."),CSS_VALID_ID,_)
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return { name: new nodes.String({start: start, value: "class", end: end}),
                                         value: value[1] }
                            });
    var ID_ATTRIBUTE    = seq(string("#"),CSS_VALID_ID,_)
                            .toNode(nodes.Attribute, function(start,value,end) {
                                return { name: new nodes.String({start: start, value: "id", end: end}),
                                         value: value[1] }
                            });

    var ATTRIBUTE = alt(BASIC_ATTRIBUTE,CLASS_ATTRIBUTE,ID_ATTRIBUTE);

    var ATTRIBUTES = seq(alt(CLASS_ATTRIBUTE,ID_ATTRIBUTE).many(),LPAREN,BASIC_ATTRIBUTE.many(),RPAREN).map(function(value) {
        return value[0].concat(value[2]);
    });

    var TAG = seq(AT, TAG_NAME, ATTRIBUTES.atMost(1), _, INDENT, _N_, sepBy(ATOM,string("\n")), _, DEDENT)
                .toNode(nodes.Tag, function(start,value,end) {
                    return {
                        name: value[1],
                        attributes: value[2][0],
                        inner: value[6]
                    }
                });

    // return ATTRIBUTES;
    return expr.many();
}

parsers.omelet = function() {

    function _p(str) { return eval(p(str)); }

    var LPAREN      = lexeme(string('(')).toNode(nodes.Symbol);
    var RPAREN      = string(')').toNode(nodes.Symbol);
    var LBRACE      = lexeme(string("{"));
    var RBRACE      = lexeme(string("}"));
    var LBRACKET    = lexeme(string("["));
    var RBRACKET    = lexeme(string("]"));
    var doublecolon = lexeme(string('::'));
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

    //Translated into AST nodes
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

    var unquotedstring = regex(/[^\)\|\(\{\\]+[\n]?/).toNode(nodes.String);

    var quotedstring = alt(seq(QUOTE1, regex(/[^\']*/), QUOTE1),
                           seq(QUOTE2, regex(/[^\"]*/), QUOTE2)).toNode(nodes.String, function(start,value,end) {
            return { value: value[1] };
        });

    var comment = lexeme(regex(/\(\*\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\)/)).toNode(nodes.Comment);

    var expr = lazy('an Omelet expression', function() {
                    return alt(RAW,DOCTYPE,comment,INCLUDE,IF_STATEMENT,FOR_LOOP,tag,parenthetical,atom);
                });

    var FILTER_PARAM  = alt(NUMBER, quotedstring, IDENT);

    //TODO: pass in custom function for Filter node, pick up params separately
    //TODO: FIX HERE
    var FILTER        = seq(pipe.then(IDENT), FILTER_PARAM.many()).toNode(nodes.Filter);

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

    module.exports.tag = tag;

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
                                left_side: value[1],
                                right_side: value[3]
                            }
                        });
    module.exports.asgt = ASSIGNMENT;

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
    var DOCUMENT = seq( _, comment.many(), EXTEND.atMost(1), _, IMPORT.many(), _, DEFINITION.many(), _, expr.many() )
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
    var BOOLEAN_ID = BOOLEAN.or(parenthetical).or(INTERPOLATION);
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


    // return expr.many();
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


module.exports.omelet2 = parsers.omelet2();
module.exports.omelet = parsers.omelet();
