var __ = require('./util.js');
var ast = require('./ast.js');
var fs = require('fs');
var parser = require('./parser.js');
var errors = require('./errors.js');
var filters = require('./filters.js');

var html_elements = {
    void: __.toMap("area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr"),
    raw: __.toMap("script,style"),
    escapableraw: __.toMap("textarea,title")
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
* Apply a filter to input string, with possible arguments.
* Return error if the filter is undefined.
*/
function applyFilter(filterNode,input,filterArgs,originalCode) {
    var filterName = filterNode.value[0].value;

    if (filters[filterName]===undefined) {
        return errors.SyntaxError({
            message: "Cannot apply undefined filter '"+filterName+"'.",
            index: filterNode.value[0].start,
            input: originalCode
        });
    }

    filterArgs.unshift(input);
    return filters[filterName].apply(filterNode, filterArgs);
}


function Scope(context) {
    var env = [context];
    this.open = function() {
        env.unshift({});
    }
    this.close = function() {
        env.shift();
    }
    this.add = function(key,value) {
        if (env[0][key]) {
            throw Error("Variable `"+key+"` is already defined in this scope.");
        }
        env[0][key] = value;
    }
    this.find = function(key) {
        for (var i=0; i<env.length; i++) {
            for (var k in env[i]) {
                if (k==key) {
                    return env[i][key];
                }
            }
        }
        return;
    }
    this.state = function() { return env; }
}

var evaluators = {};

/*
* Translate AST into HTML.
*/
evaluators.html = function(ast, originalCode, context) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    var scope = new Scope(context);

    function evalInclude(node) {

        try {
            var stats = fs.lstatSync(node.file);
            if (stats.isDirectory()) {
                throw EvalError("Included file `"+node.file+"` is a directory.");
            }
        } catch (e) {
            console.log(e);
            throw EvalError("Included file `"+node.file+"` could not be found.");
        }

        var contents = fs.readFileSync(node.file);

        if (!contents) throw EvalError("Included file `"+node.file+"` could not be read.");

        var text = contents.toString();
        var input = text.split('\n').join(" ").replace(/\"/g,"\'");

        var includedAST = parser.parse(input);

        if (includedAST.status === false) return errors.ParseError(includedAST,input);

        var output = "";
        for (var i=0; i<includedAST.value.length; i++) {
            if (includedAST.value[i].kind !== "MacroDefinition"
                && includedAST.value[i].kind !== "Assignment") {
                output += evalExpr(includedAST.value[i]);
            }
        }

        return output;
    }

    function evalAssignment(node) {
        scope.add(node.left_side.value, node.right_side);
        return "";
    }

    function evalMacroDefinition(node) {
        scope.add(node.name.value, {params: node.params, body: node.body});
        return "";
    }

    function evalNumber(node) {
        return parseInt(node.value);
    }
    function evalString(node) {
        return node.value;
    }
    function evalIdentifier(node) {
        var val = scope.find(node.value);
        if (val) {
            return evalExpr(val);
        }
        return node.value;
    }
    function evalAttribute(node) {
        return evalExpr(node.name)+"=\""+evalExpr(node.value)+"\"";
    }
    function evalTag(node) {

        //open a new scope within tag
        scope.open();

        var s;
        var tagName = evalExpr(node.name);
        s = "<"+tagName;

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
                return errors.SyntaxError({
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
            for (var i=0; i<node.filters.length; i++) {
                var filterArgs = [];
                for (var j=0; j<node.filters[i].value[1].length; j++) {
                    filterArgs.push([node.filters[i].value[1][j]].map(evalExpr).join(""))
                    // filterArgs.push(evaluators.html([node.filters[i].value[1][j]]))
                }
                inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
            }

            s += inner;
            s += "</"+tagName+">";
        }

        //And close the scope again
        scope.close();

        return s;
    }
    function evalParenthetical(node) {
        //TODO: scopes in here?

        var inner = "";
        for (var i=0; i<node.inner.length; i++) {
            inner += evalExpr(node.inner[i]);
        }
        for (var i=0; i<node.filters.length; i++) {
            var filterArgs = [];
            for (var j=0; j<node.filters[i].value[1].length; j++) {
                filterArgs.push([node.filters[i].value[1][j]].map(evalExpr).join(""));
                // filterArgs.push(evaluators.html([node.filters[i].value[1][j]],originalCode))
            }
            inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
        }
        return inner;
    }
    function evalIfStatement(node) {
        var pred = evalExpr(node.predicate);
        pred = pred === "false" ? false : (pred === "true" ? true : pred);
        if (pred === true) {
            // return evaluators.html(node.thenCase,originalCode);
            return node.thenCase.map(evalExpr).join("");
        } else if (pred === false) {
            for (var i=0; i<node.elifCases.length; i++) {
                pred = evalExpr(node.elifCases[i].predicate);
                if (pred) {
                    // return evaluators.html(node.elifCases[i].thenCase,originalCode);
                    return node.elifCases[i].thenCase.map(evalExpr).join("");
                }
            }
            if (node.elseCase) {
                // return evaluators.html(node.elseCase,originalCode);
                return node.elseCase.map(evalExpr).join("");
            } else {
                return "";
            }
        } else {
            throw Error("Condition in If statement must evaluate to a boolean.");
        }
    }
    function evalForEachLoop(node) {
        var idx;
        var iterator = node.iterator.value;
        var data = scope.find(node.data.value) || [];
        var output = [];

        for (idx = 0; idx < data.length; idx++) {
            scope.open();
            scope.add(iterator, data[idx]);

            for (var j=0; j<node.body.length; j++) {

                output.push(evalExpr(node.body[j]));
            }

            scope.close();
        }

        return output.join("");
    }
    function evalInterpolation(node) {
        var val = scope.find(node.name.value);
        var output;

        if (!val) {
            if (node.arguments.length > 0) {
                throw Error("Could not evaluate undefined macro `"+node.name.value+"`.\n\n"+scope.state());
            } else {
                throw Error("Could not evaluate undefined variable `"+node.name.value+"`.\n\n"+scope.state());
            }
        }

        //Handle modifiers
        //   i.e. for "person.name", val="person" right now, so
        //        we need to traverse through the person object
        var name = node.name.value;
        if (node.name.modifiers) {
            for (var i=0; i<node.name.modifiers.length; i++) {
                var m = node.name.modifiers[i];
                name += ("[\""+m.value.value+"\"]");

                var key = m.value.kind==="Number" ?
                            parseInt(m.value.value) : m.value.value;

                if (!val[key]) {
                    throw Error("Object `"+name+"` is not defined.");
                }
                val = val[key]
            }
        }

        if (val.params) {
            if (val.params.length !== node.arguments.length) {
                throw Error("Incorrect number of arguments given to macro `"+
                            node.name.value+"`. Expected "+val.params.length+
                            " but got "+node.arguments.length);
            }
            scope.open();
            for (var i=0; i<val.params.length; i++) {
                scope.add(val.params[i].value,node.arguments[i]);
            }
            var body = evalExpr(val.body);

            scope.close();

            output = body;
        } else {
            output = evalExpr(val);
        }
        if (node.filters) {
            for (var i=0; i<node.filters.length; i++) {
                var filterArgs = [];
                for (var j=0; j<node.filters[i].value[1].length; j++) {
                    filterArgs.push( [node.filters[i].value[1][j]].map(evalExpr).join("") )
                }
                output = applyFilter(node.filters[i],output,filterArgs,originalCode);
            }
        }
        return output;
    }
    function evalComment(node) {
        return "";
    }
    function evalExpr(node) {
        switch (node.kind) {
            case "Number":
                return evalNumber(node);
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
            case "ForEachLoop":
                return evalForEachLoop(node);
            case "Interpolation":
                return evalInterpolation(node);
            case "MacroDefinition":
                return evalMacroDefinition(node);
            case "Raw":
                return node.value;
            case "Include":
                return evalInclude(node);
            default:
                return node;
                // throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }
    function evalDoctype(node) {
        //TODO: match Jade, et al. for doctype shorthands

        if (!node) return "";
        function wrap(middle) {
            return "<!DOCTYPE "+middle+">";
        }
        switch (node.value.value.toLowerCase()) {
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
                return wrap(node.value.value.toLowerCase());
        }
    }
    return ast.map(evalExpr).join("");
}

module.exports = evaluators;
module.exports.mergeAttributes = mergeAttributes;