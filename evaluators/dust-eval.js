/*
 * Transform a Toast AST into Dust
 * Written by Reid Mitchell, Feb. 2016
 *
 * Toast: https://github.com/reid47/toast
 * Dust: http://akdubya.github.io/dustjs/
 */

var __ = require('../util.js');
var ast = require('../ast.js');
var fs = require('fs');
var parsers = require('../parsers.js');
var err = require('../errors.js');
var filters = require('../filters.js');

var html_elements = {
    void: __.toMap("area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr"),
    raw: __.toMap("script,style"),
    escapableraw: __.toMap("textarea,title")
}

module.exports = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    function evalInclude(node) {
        return "{>"+evalExpr(node.file)+"/}";
    }
    function evalImport(node) {
        //No imports in Dust
        return "";
    }
    function evalExtend(node) {
        return "{>"+evalExpr(node.file)+"/}";
    }
    function evalAssignment(node) {
        var left = evalExpr(node.leftSide);
        var out = "{+"+left+"}\n";
        out += evalExpr(node.rightSide);
        out += "\n{/"+left+"}";
        return out;
    }
    function evalMacroDefinition(node) {
        var name = evalExpr(node.name);
        var out = "{<"+name+"}\n";

        if (node.params && node.params.length > 0) {
            console.warn("Dust does not support macros (inline partials)"+
                        " that take parameters. The parameters defined for"+
                        " macro '"+name+"' are being ignored.");
        }

        if (__.isArray(node.body)) {
            out += node.body.map(evalExpr).join("");
        } else {
            out += evalExpr(node.body);
        }

        out += "{/"+name+"}\n";
        return out;
    }
    function evalBoolean(node) {
        return node.value;
    }
    function evalNumber(node) {
        return node.value;
    }
    function evalString(node) {
        switch (node.value) {
            case "\n": return "{~n}";
            case "\r": return "{~r}";
            case " ":  return "{~s}";
            case "{":  return "{~lb}";
            case "}":  return "{~rb}";
        }
        return node.value;
    }
    function evalRange(node) {
        console.warn("Dust does not support ranges. Ranges will not be translated into anything at all.");
        return "";
    }
    function evalArray(node) {
        console.warn("Dust does not support arrays. Arrays will not be translated into anything at all.");
        return "";
    }
    function evalIdentifier(node) {
        var out = node.value;
        if (node.modifiers) {
            for (var i=0; i<node.modifiers.length; i++) {
                var m = node.modifiers[i];
                if (m.value.kind==="Number") {
                    out += "["+parseInt(m.value.value)+"]";
                } else {
                    out += "."+m.value.value;
                }
            }
        }
        return out;
    }
    function evalAttribute(node) {
        return evalExpr(node.name)+"=\""+evalExpr(node.value)+"\"";
    }
    function evalTag(node) {
        var s;
        var tagName = evalExpr(node.name);
        s = "<"+tagName;

        var attributes = __.mergeAttributes(node.attributes,"class");
        for (var i=0; i<attributes.length; i++) {
            s += " "+evalExpr(attributes[i]);
        }

        if (html_elements.void[tagName]) {
            var inner = "";
            for (var i=0; i<node.inner.length; i++) {
                inner += evalExpr(node.inner[i]);
            }
            if (inner !== "") {
                return err.SyntaxError({
                    message: "'"+tagName+"' is a void (self-closing) tag and cannot have any contents.",
                    index: node.inner[0].start,
                    input: originalCode
                });
            }
            s += "/>";
        } else {
            s += ">";

            var inner = "";
            for (var i=0; i<node.inner.length; i++) {
                inner += evalExpr(node.inner[i]);
            }

            s += inner;
            s += "</"+tagName+">";
        }

        return s+"\n";
    }
    function evalParenthetical(node) {
        return node.inner.map(evalExpr).join("");
    }
    function evalIfStatement(node) {
        if (node.predicate.kind !== "Identifier") {
            console.warn("Dust only supports if statements where the predicate is an identifier.");
            return "";
        }
        var pred = evalExpr(node.predicate);
        var out;

        if (node.negated) {
            out = "{^"+pred+"}\n"
        } else {
            out = "{?"+pred+"}\n";
        }

        out += node.thenCase.map(evalExpr).join("");

        if (node.elifCases || node.elseCase) {
            out += "{:else}\n";
            /*
            * We can restructure the elifs to be nested if/else nodes!
            * If                    If
            *   thenCase              thenCase
            *   elifCase[0]           else(new)
            *   elifCase[1]    ->       If
            *   elifCase[2]               thenCase(from elifCase[0])
            *   elseCase                  else(new)
            *                               If...
            */
            if (node.elifCases && node.elifCases.length > 0) {
                var newIf = {
                    kind: "IfStatement",
                    predicate: node.elifCases[0].predicate,
                    negated: node.elifCases[0].negated,
                    thenCase: node.elifCases[0].thenCase
                }
                var ptr = newIf;
                for (var i=1; i<node.elifCases.length; i++) {
                    var elif = node.elifCases[i];
                    ptr.elseCase = [{
                        kind: "IfStatement",
                        predicate: elif.predicate,
                        negated: elif.negated,
                        thenCase: elif.thenCase
                    }];
                    ptr = ptr.elseCase[0];
                }
                ptr.elseCase = node.elseCase;

                out += evalExpr(newIf);

            } else if (node.elseCase) {
                out += node.elseCase.map(evalExpr).join("");
            }
        }
        out += "{/"+pred+"}\n";
        return out;
    }
    function evalForEach(node) {
        var iterator = evalExpr(node.iterator);
        var data = evalExpr(node.data);
        var out = "{#"+data+"}\n";
        out += node.body.map(evalExpr).join("");
        console.log("iterator is "+iterator);
        var iterPattern = new RegExp("{"+iterator+"[\.]?","g");
        console.log("iterpattern is "+iterPattern);
        out = out.replace(iterPattern, "{.");
        // if (node.elseCase) {
        //     out += "{:else}\n";
        //     out += node.elseCase.map(evalExpr).join("");
        // }
        out += "\n{/"+data+"}";
        return out;
    }
    function evalInterpolation(node) {
        var out;
        if (node.isMacroCall) {
            //Macros don't take args in Dust
            if (node.arguments.length > 0) {
                console.warn("Partials don't take arguments in Dust. The arguments given "+
                             "to partial "+evalExpr(node.name)+" have been ignored.");
            }
            out = "{+"+evalExpr(node.name)+"/}";
        } else {
            out = "{"+evalExpr(node.name);
            for (var i=0; i<node.filters.length; i++) {
                //Filters don't take args in Dust
                if (["s","u","h","j"].indexOf(node.filters[i].name) > -1) {
                    out += "|"+node.filters[i].name;
                } else {
                    console.warn("Only filters |s, |u, |j, and |h "+
                                    "are allowed in Dust. Filter |"+
                                    node.filters[i].name+" was not translated.");
                }
            }
            out += "}";
        }
        return out;
    }
    function evalDoctype(node) {

        function wrap(middle) {
            return "<!DOCTYPE "+middle+">";
        }
        switch (node.value.toLowerCase()) {
            case "html5":
            case "html":
            case "5":
                return wrap("html");
            case "4.01":
            case "transitional":
                return wrap("HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional"+
                            "//EN\" \"http://www.w3.org/TR/html4/loose.dtd\"");
            case "frameset":
                return wrap("HTML PUBLIC \"-//W3C//DTD HTML 4.01 Frameset"+
                            "//EN\" \"http://www.w3.org/TR/html4/frameset.dtd\"");
            case "xhtml_1.0":
            case "xhtml_1.0_strict":
            case "xhtml_strict":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict"+
                            "//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\"");
            case "xhtml_1.0_transitional":
            case "xhtml_transitional":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\""+
                            " \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\"");
            case "xhtml_1.0_frameset":
            case "xhtml_frameset":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.0 Frameset //EN\""+
                            " \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\"");
            case "xhtml_1.1":
                return wrap("html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\""+
                            " \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\"");
            default:
                return wrap(node.value.toLowerCase());
        }
    }
    function evalComment(node) {
        return "{! "+node.value+" !}\n";
    }
    function evalCommentHTML(node) {
        return "<!--"+node.value+"-->";
    }
    function evalInternalConditional(node) {

    }
    function evalExpr(node) {
        switch (node.kind) {
            case "Number":
                return evalNumber(node);
            case "Boolean":
                return evalBoolean(node);
            case "String":
                return evalString(node);
            case "Identifier":
                return evalIdentifier(node);
            case "Attribute":
                return evalAttribute(node);
            case "Tag":
                return evalTag(node);
            case "Comment":
                return evalComment(node);
            case "CommentHTML":
                return evalCommentHTML(node);
            case "Parenthetical":
                return evalParenthetical(node);
            case "Assignment":
                return evalAssignment(node);
            case "IfStatement":
                return evalIfStatement(node);
            case "ForEach":
                return evalForEach(node);
            case "Interpolation":
                return evalInterpolation(node);
            case "MacroDefinition":
                return evalMacroDefinition(node);
            case "Raw":
                return node.value;
            case "Include":
                return evalInclude(node);
            case "Import":
                return evalImport(node);
            case "Extend":
                return evalExtend(node);
            case "Doctype":
                return evalDoctype(node);
            case "Array":
                return evalArray(node);
            case "Range":
                return evalRange(node);
            case "InternalConditional":
                return evalInternalConditional(node);
            default:
                throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }

    if (ast.extend) {
        return evalExtend(ast);
    }
    ast.imports.map(evalExpr);
    return ast.contents.map(evalExpr).join("");
}
