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
var alt = Parsimmon.alt;
var eof = Parsimmon.eof;
var any = Parsimmon.any;
var takeWhile = Parsimmon.takeWhile;
var _ = Parsimmon.optWhitespace;

function opt(p) { return p.atMost(1); }
// function lexeme(p) { return p.skip(optWhitespace); }
function lexeme(p) { return p; }

function _p(str) {
    "use strict";
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

//     for (var i=0; i<s.length; i++) {
//       var last = s[i].charAt(s[i].length-1);
//       var sub = s[i].substring(0,s[i].length-1);
//       switch (last) {
//         case "*":
//           s[i] = sub+".many()"; break;
//         case "+":
//           s[i] = sub+".atLeast(1)"; break;
//         case "?":
//           s[i] = sub+".atMost(1)"; break;
//       }
//     }

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
    return eval(p(str));
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

//Not included in AST
var LPAREN      = lexeme(string('(')).toNode(nodes.Symbol);
var RPAREN      = lexeme(string(')')).toNode(nodes.Symbol);
var LBRACE      = lexeme(string("{"));
var RBRACE      = lexeme(string("}"));
var LBRACKET    = lexeme(string("["));
var RBRACKET    = lexeme(string("]"));
var doublecolon = lexeme(string('::'));
var pipe        = lexeme(string('|'));
var quote       = lexeme(string("'"));
var EQUALSIGN   = lexeme(string("="));
var dot         = lexeme(string("."));
var hash        = lexeme(string("#"));
var singlecolon = lexeme(string(":"));
var EXCLAM      = lexeme(string("!"));
var DOLLAR      = lexeme(string("$"));
var BOOLEAN     = lexeme(string("true").or(string("false"))).toNode(nodes.Boolean);


//Translated into AST nodes
var NUMBER = lexeme(regex(/[0-9]+/).map(parseInt).toNode(nodes.Number));

// var RAW = seq(string("<!"), regex(/^((cat(?!$)).+|(?!cat).+)$/), string("!>")).toNode(nodes.Raw, function(s,v,e) { return { value: v[1] } });


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

var VARIABLE_NAME = lexeme(regex(/\$[a-z][a-zA-Z0-9_-]*/i).toNode(nodes.Identifier));

var ESCAPED_CHAR = alt(lexeme(string("\\(")), lexeme(string("\\|")), lexeme(string("\\\"")))
                    .map(function(s) { return s.slice(1) });

var unquotedstring = alt(lexeme(regex(/[^\n\)\|\(\{\\]+/)).toNode(nodes.String));
var quotedstring = seq(quote, lexeme(regex(/[^\']*/)), quote).toNode(nodes.String, function(start,value,end) {
        return { value: value[1] };
    });
var optquotedstring = alt(unquotedstring, quotedstring);

var comment = lexeme(regex(/\(\*\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\)/)).toNode(nodes.Comment);

var expr = lazy('an Omelet expression', function() {
                return alt(RAW,comment,IF_STATEMENT,FOR_LOOP,tag,parenthetical,ASSIGNMENT,MACRO_DEFINITION,atom);
            });

var FILTER_PARAM  = _p("_ (NUMBER | quotedstring | IDENT)");

//TODO: pass in custom function for Filter node, pick up params separately
//TODO: FIX HERE
var FILTER = seq( pipe, _, IDENT, _, FILTER_PARAM.many(), _).toNode(nodes.Filter, function(start,value,end) {
    return {
        name: value[0],
        params: value[2]
    }
});


var MACRO_ARGUMENT = _p("NUMBER | BOOLEAN | quotedstring | IDENT");

var INTERPOLATION = _p("LBRACE _ (IDENT_COMPLEX | IDENT) _ (MACRO_ARGUMENT _)* FILTER* RBRACE")
                        .toNode(nodes.Interpolation, function(start,value,end) {
                            return {
                                name: value[2],
                                arguments: value[4],
                                filters: value[3]
                            }
                        });

var CSS_VALID_ID = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/).toNode(nodes.String));

var basic_attribute = seq(IDENT.skip(EQUALSIGN),alt(quotedstring,INTERPOLATION))
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: value[0],
                                     value: value[1] }
                        });
var class_attribute = dot.then(CSS_VALID_ID)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: new nodes.Identifier({start: start, value: "class", end: end}),
                                     value: value }
                        });
var id_attribute    = hash.then(CSS_VALID_ID)
                        .toNode(nodes.Attribute, function(start,value,end) {
                            return { name: new nodes.Identifier({start: start, value: "id", end: end}),
                                     value: value }
                        });
var attribute       = _p("basic_attribute | class_attribute | id_attribute");

var atom = _p("NUMBER | INTERPOLATION | unquotedstring");

var TAG_NAME = lexeme(regex(/[a-zA-Z][a-zA-Z0-9_-]*/)).toNode(nodes.String);
var tag = seq(LPAREN.then(TAG_NAME),attribute.many(),doublecolon.then(expr.many()),FILTER.many().skip(RPAREN))
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

var DEF = lexeme(string("def"));
var ASSIGNMENT = seq(DEF, IDENT, EQUALSIGN, alt(NUMBER, BOOLEAN, quotedstring, tag, parenthetical) )
                    .toNode(nodes.Assignment, function(start,value,end) {
                        return {
                            left_side: value[1],
                            right_side: value[3]
                        }
                    });


var MACRO_DEFINITION = seq(DEF.then(IDENT),IDENT.many().skip(EQUALSIGN),expr)
                    .toNode(nodes.MacroDefinition, function(start,value,end) {
                        return {
                            name: value[0],
                            params: value[1],
                            body: value[2]
                        }
                    });

var DOCTYPE = lexeme(string("(!").then(IDENT)).skip(RPAREN).toNode(nodes.Doctype);

var DOCUMENT = seq(DOCTYPE.atMost(1),expr.many())
                    .toNode(nodes.Document, function(start,value,end) {
                        return {
                            doctype: value[0][0],
                            contents: value[1]
                        }
                    });

var OmeletParser = expr.many();

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
var ELSE_STATEMENT = seq(LPAREN.then(ELSE), doublecolon, expr.many(), RPAREN);
var ELIF_STATEMENT = seq(
        LPAREN.then(ELIF), BOOLEAN_ID, doublecolon, expr.many(), RPAREN
    ).toNode(nodes.IfStatement, function(start,value,end) {
        return {
            predicate: value[1],
            thenCase: value[3]
        }
    });
var IF_STATEMENT = seq(
        LPAREN.then(IF), BOOLEAN_ID, doublecolon, expr.many(), RPAREN,
        ELIF_STATEMENT.many(),
        ELSE_STATEMENT.atMost(1)
    ).toNode(nodes.IfStatement, function(start,value,end) {
        return {
            predicate: value[1],
            thenCase: value[3],
            elifCases: value[5],
            elseCase: value[6][0] ? value[6][0][2] : undefined,
        }
    });

var FOR = lexeme(string("for"));
var IN = lexeme(string("in"));
var FOR_LOOP = seq(LPAREN, FOR, IDENT, IN, IDENT, doublecolon, expr.many(), RPAREN)
                .toNode(nodes.ForEachLoop, function(start,value,end) {
                    return {
                        iterator: value[2],
                        data: value[4],
                        body: value[6]
                    }
                });

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


var originalCode;
function parse(input) {
    originalCode = input;
    return OmeletParser.parse(input);
}

function p(str) {

}



module.exports.parse = parse;
module.exports.nodes = nodes;

//to be deleted
module.exports.raw = RAW;
// module.exports.ae = ARITH_EXPR;