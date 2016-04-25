/*
 * Transform a Toast AST into Liquid
 * Written by Reid Mitchell, Mar. 2016
 *
 * Toast: https://github.com/reid47/toast
 * Liquid: https://github.com/Shopify/liquid/
 */

var __ = require('../util.js');
var ast = require('../ast.js');
var fs = require('fs');
var parsers = require('../parsers.js');
var err = require('../errors.js');
var filters = require('../filters.js');
var evaluators = require('../evaluators.js');

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
        return "{% include '"+evalExpr(node.file)+"' %}\n";
    }
    function evalImport(node) {
        console.warn("Liquid does not support import statements.");
        return "";
    }
    function evalExtend(node) {
        return "{% extends \""+evalExpr(node.file)+"\" %}\n";
        return "";
    }
    function evalMacroDefinition(node) {
        var name = evalExpr(node.name);
        var out = "{% capture "+name+" %}\n";

        if (node.params && node.params.length > 0) {
            console.warn("Liquid does not support macros (captures)"+
                        " that take parameters. The parameters defined for"+
                        " the capture '"+name+"' are being ignored.");
        }

        if (__.isArray(node.body)) {
            out += node.body.map(evalExpr).join("");
        } else {
            out += evalExpr(node.body);
        }

        out += "{% endcapture %}\n";
        return out;
    }
    function evalBoolean(node) {
        return node.value;
    }
    function evalNumber(node) {
        return node.value;
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
        var s;
        var tagName = evalExpr(node.name);
        s = "<"+tagName;

        var attributes = evaluators.mergeAttributes(node.attributes,"class");
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
                var tmp = evalExpr(node.inner[i]);
                if (node.inner[i].kind==="String") {
                    tmp = evaluators.escapeHTML(tmp);
                }
                inner += tmp;
            }

            s += inner.trim();
            s += "</"+tagName+">";
        }

        return s;
    }
    function evalIfStatement(node) {
        if (node.predicate.kind !== "Identifier") {
            console.warn("Toast only supports if statements where the predicate is a variable.");
            return "";
        }
        var pred = evalExpr(node.predicate);
        var out;

        if (!node.negated) {
            out = "{% if "+pred+" %}\n";
        } else {
            out = "{% unless "+pred+" %}\n"
        }
        out += node.thenCase.map(evalExpr).join("");

        if (node.elifCases) {
            for (var i=0; i<node.elifCases.length; i++) {
                out += "{% elsif "+evalExpr(node.elifCases[i].predicate)+" %}\n";
                out += node.elifCases[i].thenCase.map(evalExpr).join("");
            }
        }

        if (node.elseCase) {
            out += "{% else %}\n";
            out += node.elseCase.map(evalExpr).join("");
        }

        if (!node.negated) {
            out += "{% endif %}\n";
        } else {
            out += "{% endunless %}\n";
        }
        return out;
    }
    function evalForEach(node) {
        var data = evalExpr(node.data);
        var iter = evalExpr(node.iterator);
        var out = "{% for "+iter+" in "+data+" %}\n";
        out += node.body.map(evalExpr).join("");
        out += "{% endfor %}\n";
        return out;
    }
    function evalInterpolation(node) {
        var out = "{{ "+evalExpr(node.name);
        for (var i=0; i<node.filters.length; i++) {
            //TODO: translate filter names when possible, e.g. uppercase <-> upper
            //      something like getFilterName(evaledName, inputLanguage, outputLanguage)
            var rawFilterName = evalExpr(node.filters[i].name);
            var translatedFilterName = filters.$translate(rawFilterName, config.sourceLanguage, "liquid");

            out += " | "+translatedFilterName;
            if (node.filters[i].arguments.length > 0) {
                out += ": ";
                for (var j=0; j<node.filters[i].arguments.length; j++) {
                    var isString = node.filters[i].arguments[j].kind === "String";
                    if (isString) {
                        out += "\""+evalExpr(node.filters[i].arguments[i])+"\"";
                    } else {
                        out += evalExpr(node.filters[i].arguments[i]);
                    }
                    if (j < node.filters[i].arguments.length-1) {
                        out += ", "
                    }
                }
            }
        }
        out += " }}";
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
        return "{% comment %}"+node.value+"{% endcomment %}";
    }
    function evalCommentHTML(node) {
        return "<!--"+node.value+"-->";
    }
    function evalRaw(node) {
        return "{% raw %}"+node.value+"{% endraw %}";
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
                throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }

    var o = "";
    if (ast.extend) {
        o += evalExtend(ast.extend);
    }
    o += ast.imports.map(evalExpr);
    o += ast.contents.map(evalExpr).join("");
    return o;
}
