var __ = require('./util.js');
var ast = require('./ast.js');
var fs = require('fs');
var parsers = require('./parsers.js');
var err = require('./errors.js');
var filters = require('./filters.js');
var visitor = require('./visitor.js');
var indentation = require('./indentation.js');

var fileStoragePrefix = "__TOAST__IDE__file__:";
var fileStorageCurrent = "__TOAST__IDE__latest__";

var html_elements = {
    void: __.toMap("area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr"),
    raw: __.toMap("script,style"),
    escapableraw: __.toMap("textarea,title")
}


function Scope() {
    var env = [{}];
    this.open = function() {
        env.unshift({});
    }
    this.close = function() {
        env.shift();
    }
    this.add = function(key,value,override) {
        if (env[0][key]) {
            if (env[0][key].override) {
                return;
            } else {
                throw Error("Variable '"+key+"' is already defined in this scope. Trying to give it value: "+JSON.stringify(value)+", scope is: "+this.state());
            }
        }
        env[0][key] = {value: value, override: !!override};
    }
    this.addAll = function(obj) {
        var keys = Object.keys(obj);
        for (var i=0; i<keys.length; i++) {
            this.add(keys[i], obj[keys[i]]);
        }
    }
    this.find = function(key) {
        for (var i=0; i<env.length; i++) {
            for (var k in env[i]) {
                if (k==key) {
                    return env[i][key].value;
                }
            }
        }
        return;
    }
    this.state = function() { return "\n"+JSON.stringify(env,null,4); }
}

/*
* A function to merge attributes that have the same name.
*   param: attrList (list of AST Attribute nodes)
*   param: attrName (string name of attribute to merge)
*/
function mergeAttributes(attrList,attrName) {
    if (attrList.length < 2) return attrList;

    var toMerge = [];
    var indices = [];

    for (var i=0; i<attrList.length; i++) {
        if (attrList[i].name.value === attrName) {
            toMerge.push(attrList[i]);
            indices.push(i);
        }
    }

    if (toMerge.length == 0) return attrList;

    var newAttrVal = "";
    for (var i=0; i<toMerge.length; i++) {
        newAttrVal += toMerge[i].value.value + " ";
    }
    newAttrVal = newAttrVal.trim();
    toMerge[0].value.value = newAttrVal;

    for (var i=1; i<toMerge.length; i++) {
        attrList.splice(indices[i],1);
    }

    return attrList;
}

/*
* Replace illegal HTML characters with their safe HTML
* character codes.
*/
function escapeHTML(input) {
    return input.replace(/\'/g, "&apos;")
                .replace(/\"/g, "&quot;")
                .replace(/\&/g, "&amp;")
                .replace(/\</g, "&lt;")
                .replace(/\>/g, "&gt;");
}

/*
* Apply a filter to input string, with possible arguments.
* Return error if the filter is undefined.
*/
function applyFilter(filterNode,input,filterArgs,originalCode) {
    var filterName = filterNode.name.value;

    if (filters[filterName]===undefined) {
        throw EvalError("Cannot apply undefined filter '"+filterName+"'.");
    }
    filterArgs.unshift(input);
    filterArgs = input===undefined ? [undefined] : filterArgs;
    var result = filters[filterName].apply(filterNode, filterArgs);
    return result;
}

/*
* Collect all MacroDefinition and Assignment nodes that
* appear in an AST in one flat list.
*
* Makes use of our visitor pattern, which can be used as
* a map/fold function over the AST.
*/
function collectDefinitions(ast) {
    var f = function(node,acc) {
        if (node.kind === "Assignment" ||
            node.kind === "MacroDefinition") {
            acc.push(node);
        }
    }
    var res = visitor.visit(ast,f,[]);
    return res;
}

/*
* Check to see if a node or its children contains any
* references to a given identifier. This is used to prevent
* recursion: in an assignment statement, the right side should
* contain no references to the identifier on the left side.
*/
function checkForReferences(root, identString) {
    var f = function(node,acc) {
        if (node.kind === "Identifier" &&
            node.value === identString) {
            acc.push(true);
        }
    }
    var res = visitor.visit(root,f,[]);
    return res;
}

/*
* Check to see if a document extends another document.
* If so, we'll bypass the normal evaluation.
* Again, this makes use of the visitor pattern.
*
* Returns false, if no Extend node found in document
*  & otherwise, returns the first Extend node found
*/
function checkExtends(ast) {
    var f = function(node,acc) {
        if (node.kind === "Extend") {
            acc.push(node);
        }
    }
    var res = visitor.visit(ast,f,[]);
    if (res.length > 0) {
        return res[0];
    } else {
        return false;
    }
}

var evaluators = {};

/*
* Translate AST into Omelet.
*/
evaluators.omelet = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    function evalInclude(node) {
        return "(include \""+node.file+"\")\n"; //newline at end? TODO?
    }

    function evalImport(node) {
        return "import \""+node.file+"\"\n";
    }

    function evalExtend(node) {
        return "extend \""+node.file+"\"\n";
    }

    function evalAssignment(node) {
        var rightSide;
        if (node.rightSide.kind==="String") {
            rightSide = "\""+evalExpr(node.rightSide)+"\"";
        } else {
            rightSide = evalExpr(node.rightSide);
        }//maybe also need a case that wraps in (parens) ??
        return "def "+node.leftSide.value+" = "+rightSide+"\n";
    }

    function evalMacroDefinition(node) {
        //TODO: how do we handle this case?
        //not a problem coming from HTML, since no macros,
        //but we'll need to figure this out...
        var out = "def "+node.name.value;
        if (node.params) {
            for (var i=0; i<node.params; i++) {
                out += " "+node.params[i].value;
            }
        }
        if (__.isArray(node.body)) {
            out += " = (" + val.body.map(evalExpr).join("\n") + ")";
        } else {
            out += " = " + evalExpr(node.body);
        }
        return out+"\n";
    }
    function evalBoolean(node) {
        return node.value;
    }
    function evalNumber(node) {
        return parseInt(node.value);
    }
    function evalString(node) {
        return node.value;
    }
    function evalRange(node) {
        var out = "[";
        out += evalExpr(node.startIndex);
        out += "..";
        out += evalExpr(node.endIndex);
        out += "]";
        return out;
    }
    function evalArray(node) {
        var out = "[";
        var evaluated = node.elements.map(evalExpr);
        out += evaluated.join(",")
        out + "]";
        return out;
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
        s = "("+tagName;

        var attributes = mergeAttributes(node.attributes,"class");
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
            s += "::)";
        } else {
            s += "::";

            var inner = "";
            for (var i=0; i<node.inner.length; i++) {
                inner += evalExpr(node.inner[i]);
            }

            if (node.filters) {
                for (var i=0; i<node.filters.length; i++) {
                    inner += "| "+evalExpr(node.filters[i].name);
                    if (node.filters[i].arguments.length > 0) {
                        inner += " ";
                        inner += node.filters[i].arguments.map(evalExpr).join(" ");
                    }
                }
            }

            s += inner;
            s += ")";
        }

        return s+"\n";
    }
    function evalParenthetical(node) {
        var inner = "(";
        for (var i=0; i<node.inner.length; i++) {
            inner += evalExpr(node.inner[i]);
        }
        if (node.filters) {
            for (var i=0; i<node.filters.length; i++) {
                inner += "| "+evalExpr(node.filters[i].name);
                if (node.filters[i].arguments.length > 0) {
                    inner += " ";
                    inner += node.filters[i].arguments.map(evalExpr).join(" ");
                }
            }
        }
        inner += ")";
        return inner;
    }
    function evalIfStatement(node) {
        var out = "(if ";
        out += evalExpr(node.predicate);
        out += " ::";
        out += node.thenCase.map(evalExpr).join("");
        out += ")";
        if (node.elifCases) {
            for (var i=0; i<node.elifCases.length; i++) {
                out += "(elif ";
                out += evalExpr(node.elifCases[i].predicate);
                out += " ::";
                out += node.elifCases[i].thenCase.map(evalExpr).join("");
                out += ")";
            }
        }
        if (node.elseCase) {
            out += "(else ::";
            out += node.elseCase.map(evalExpr).join("");
            out += ")\n";
        }
        return out;
    }
    function evalForEach(node) {
        var out = "(for ";
        out += node.iterator.value + " in ";
        out += evalExpr(node.data)+"::";
        out += node.body.map(evalExpr).join("");
        out += ")\n";
        return out;
    }
    function evalInterpolation(node) {
        var out = "{";
        out += node.name.value;
        if (node.arguments) {
            for (var i=0; i<node.arguments.length; i++) {
                out += " " + evalExpr(node.arguments[i]);
            }
        }
        if (node.filters) {
            for (var i=0; i<node.filters.length; i++) {
                out += "| "+evalExpr(node.filters[i].name);
                if (node.filters[i].arguments.length > 0) {
                    out += " ";
                    out += node.filters[i].arguments.map(evalExpr).join(" ");
                }
            }
        }
        out += "}";
        return out;
    }
    function evalDoctype(node) {
        return "(doctype "+node.value+")\n";
    }
    function evalComment(node) {
        return "(* "+node.value+" *)";
    }
    function evalRaw(node) {
        return "<!"+node.value+"!>";
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
                return evalRaw(node);
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
                return evalExpr(node.thenCase);
            default:
                throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }

    var out = "";
    if (ast.extend) {
        out += evalExtend(ast);
    }
    if (ast.imports) {
        out += ast.imports.map(evalExpr).join("");
    }
    out += ast.contents.map(evalExpr).join("");

    return out;
}

module.exports.dust = require('./evaluators/dust-eval.js');
module.exports.liquid = require('./evaluators/liquid-eval.js');
module.exports.html = require('./evaluators/html-eval.js');

module.exports.Scope = Scope;
module.exports.applyFilter = applyFilter;
module.exports.escapeHTML = escapeHTML;
module.exports.mergeAttributes = mergeAttributes;
module.exports.checkForReferences = checkForReferences;
module.exports.checkExtends = checkExtends;
