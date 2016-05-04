/*
 * Transform a Toast AST into Omelet
 * Written by Reid Mitchell, Apr. 2016
 *
 * Toast: https://github.com/reid47/toast
 * Omelet: https://github.com/reid47/toast
 */

var __ = require('../util.js');
var ast = require('../ast.js');
var fs = require('fs');
var parsers = require('../parsers.js');
var err = require('../errors.js');
var filters = require('../filters.js');
var evaluators = require('../evaluators.js');
var indentation = require('../indentation.js');

var html_elements = {
    void: __.toMap("area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr"),
    raw: __.toMap("script,style"),
    escapableraw: __.toMap("textarea,title")
}

var indentLevel = 0;

module.exports = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    function evalInclude(node) {
        return "{>include "+evalExpr(node.file)+"}\n";
    }
    function evalImport(node) {
        return ">import "+evalExpr(node.file)+"\n";
    }
    function evalExtend(node) {
        return ">extend "+evalExpr(node.file)+"\n";
    }
    function evalMacroDefinition(node) {
        var name = evalExpr(node.name);
        var out = ">def "+name+"(";
        var params = node.params.map(function(n){ return n.value });
        out += params.join(", ");
        out += "):\n";
        indentLevel++;

        // out += indentation.of(indentLevel);
        var body = node.body.map(function(e){
            return indentation.of(indentLevel)+evalExpr(e);
        });
        out += body.join("");

        indentLevel--;
        return out;
    }
    function evalParenthetical(node) {
        return node.inner.map(evalExpr).join("");
    }
    function evalBoolean(node) {
        return node.value+"";
    }
    function evalNumber(node) {
        return node.value+"";
    }
    function evalString(node) {
        return node.value;
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
        var out = "";
        if (node.interpolated) {
            out += "{";
        }

        var tagName = evalExpr(node.name)
        out += "@"+tagName;
        //possible TODO: pull out #special.attrs like this

        if (node.attributes.length > 0) {
            var attributes = node.attributes.map(evalExpr);
            out += "["+attributes.join(" ")+"]";
        }

        if (node.inner.length > 0 && !node.interpolated) {
            out += "\n";
        }

        if (!node.interpolated) {
            console.log("incrementing indent in "+tagName)
            indentLevel++;
        }

        var inner = node.inner.map(evalExpr).join("");

        console.log(inner.split("\n").map(function(line){
            return indentation.of(indentLevel)+(line);
        }).join("\n"))

        if (!node.interpolated) {
            out += inner.split("\n").map(function(line){
                return indentation.of(indentLevel)+(line);
            }).join("\n");
        } else {
            out += " "+inner;
        }

        if (!node.interpolated) {
            console.log("decrementing indent in "+tagName)
            indentLevel--;
        }

        if (node.interpolated) {
            out += "}";
        }
        return out;
    }
    function evalIfStatement(node) {
    }
    function evalForEach(node) {
    }
    function evalInterpolation(node) {
        var out = "{"+evalExpr(node.name);
        for (var i=0; i<node.filters.length; i++) {
            var rawFilterName = evalExpr(node.filters[i].name);
            var translatedFilterName = filters.$translate(rawFilterName, config.sourceLanguage, "omelet");

            out += " | "+translatedFilterName;
            if (node.filters[i].arguments.length > 0) {
                out += " ";
                for (var j=0; j<node.filters[i].arguments.length; j++) {
                    var isString = node.filters[i].arguments[j].kind === "String";
                    if (isString) {
                        out += "\""+evalExpr(node.filters[i].arguments[j])+"\"";
                    } else {
                        out += evalExpr(node.filters[i].arguments[j]);
                    }
                    if (j < node.filters[i].arguments.length-1) {
                        out += " "
                    }
                }
            }
        }
        out += "}";
        return out;
    }
    function evalDoctype(node) {
        return "@doctype "+node.value+"";
    }
    function evalComment(node) {
        return "## "+node.value+"\n";
    }
    function evalCommentHTML(node) {
        return "<!--"+node.value+"-->";
    }
    function evalRaw(node) {
        return "```"+node.value+"```\n";
    }
    function evalExpr(node) {
        console.log("evalExpr called on node "+JSON.stringify(node))
        console.trace()
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
            case "IfStatement":
                return evalIfStatement(node);
            case "ForEach":
                return evalForEach(node);
            case "Interpolation":
                return evalInterpolation(node);
            case "MacroDefinition":
                return evalMacroDefinition(node);
            case "Raw":
                return evalRaw(node);
            case "Include":
                return evalInclude(node);
            case "Import":
                return evalImport(node);
            case "Extend":
                return evalExtend(node);
            case "Doctype":
                return evalDoctype(node);
            default:
                return node;
                // throw EvalError("No case for node of kind "+node.kind+".");
        }
    }

    var o = "";
    if (ast.extend) {
        o += evalExtend(ast.extend);
    }
    if (ast.imports) {
        o += ast.imports.map(evalExpr);
    }
    o += ast.contents.map(evalExpr).join("");
    return o;
}
