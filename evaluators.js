var __ = require('./util.js');
var ast = require('./ast.js');
var fs = require('fs');
var parsers = require('./parsers.js');
var err = require('./errors.js');
var filters = require('./filters.js');
var visitor = require('./visitor.js');

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
* Replace illegal HTML characters with their safe HTML
* character codes.
*/
function escapeHTML(input) {
    return input.replace(/\'/g, "&apos;")
                .replace(/\"/g, "&quot;")
                .replace(/(?![^\s]+\;)\&/g, "&amp;")
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
        return err.SyntaxError({
            message: "Cannot apply undefined filter '"+filterName+"'.",
            // index: filterNode.value[0].start,
            input: originalCode
        });
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

var evaluators = {};

evaluators.dust = require('./evaluators/dust-eval.js');

/*
* Translate AST into HTML.
*/
evaluators.html = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    var scope = new Scope();
    scope.addAll(context);

    var extendsChain = [];
    var includesChain = [];

    function evalInternalConditional(node) {
        var pred = eval("("+node.predicate.toString()+")()");
        if (pred) {
            return evalExpr(node.thenCase);
        } else {
            return evalExpr(node.elseCase);
        }
    }

    function evalInclude(node) {
        var file = evalExpr(node.file);

        if (includesChain.indexOf(config.directory+"/"+file) > -1) {
            throw err.EvalError({
                msg: "Template inclusion loop detected. File '"+config.directory+"/"+file
                     +"' has already been extended earlier in the includes chain."
            }, originalCode)
        }

        try {
            var stats = fs.lstatSync(config.directory+"/"+file);
            if (stats.isDirectory()) {
                throw EvalError("Included file '"+config.directory+"/"+file+"' is a directory.");
            }
        } catch (e) {
            throw EvalError("Included file '"+config.directory+"/"+file+"' could not be found.");
        }

        includesChain.push(config.directory+"/"+file);

        var contents = fs.readFileSync(config.directory+"/"+file);

        if (!contents) throw EvalError("Included file '"+config.directory+"/"+file+"' could not be read.");

        var input = contents.toString();

        try {
            var includedAST = parsers[config.sourceLanguage].parse(input);
        } catch (e) {
            throw err.ParseError(config.directory+"/"+file,e);
        }

        var output = "";

        scope.open();
        for (var i=0; i<includedAST.contents.length; i++) {
            output += evalExpr(includedAST.contents[i]);
        }
        scope.close();

        return output;
    }

    function evalImport(node) {
        try {
            var stats = fs.lstatSync(config.directory+"/"+node.file);
            if (stats.isDirectory()) {
                throw err.EvalError({
                    msg: "Imported file '"+config.directory+"/"+node.file+"' is a directory.",
                    index: node.start
                }, originalCode);
            }
        } catch (e) {
            throw err.EvalError({
                msg: "Imported file '"+config.directory+"/"+node.file+"' could not be found.",
                index: node.start
            }, originalCode);
        }

        var contents = fs.readFileSync(config.directory+"/"+node.file);

        if (!contents) {
            throw err.EvalError({
                msg: "Imported file '"+config.directory+"/"+node.file+"' could not be read.",
                index: node.start
            }, originalCode);
        }

        var input = contents.toString();

        var importedAST = parsers[config.sourceLanguage].parse(input);

        if (importedAST.status === false) {
            throw err.ParseError({
                msg: "Could not parse imported file '"+config.directory+"/"+node.file+"'.",
                index: importedAST.furthest,
                expected: importedAST.expected
            }, input);
        }

        for (var i=0; i<importedAST.contents.length; i++) {
            if (importedAST.contents[i].kind === "MacroDefinition"
                || importedAST.contents[i].kind === "Assignment") {
                evalExpr(importedAST.contents[i]);
            }
        }

        return "";
    }

    /*
    * evalExtend takes in the entire AST (Document node) when there
    * is an Extend statement present. It evaluates all of the definitions
    * in the current file, so that they are added to the scope. Then it
    * evaluates the extended file in that scope, and returns the results.
    *
    * evalExtend bypasses the normal behavior of the evaluator, since it
    * should not parse all of the current file.
    */
    function evalExtend(rootDocument, extendNode) {
        if (rootDocument.extend) {
            var rootFile = evalExpr(rootDocument.extend.file);

            if (extendsChain.indexOf(config.directory+"/"+rootFile) > -1) {
                throw err.EvalError({
                    msg: "Template inheritance loop detected. File '"+config.directory+"/"+rootFile
                         +"' has already been extended earlier in the inheritance chain.",
                    index: rootDocument.extend.start+7
                }, originalCode)
            }
        }

        for (var i=0; i<rootDocument.contents.length; i++) {
            if (rootDocument.contents[i].kind === "MacroDefinition"
                || rootDocument.contents[i].kind === "Assignment") {
                evalExpr(rootDocument.contents[i]);
            }
        }

        var node = extendNode;
        var file = evalExpr(node.file);

        try {
            var stats = fs.lstatSync(config.directory+"/"+file);
            if (stats.isDirectory()) {
                throw err.EvalError({
                    msg: "Extended file '"+config.directory+"/"+file+"'' is a directory.",
                    index: node.start+7
                }, originalCode);
            }
        } catch (e) {
            throw err.EvalError({
                msg: "Extended file '"+config.directory+"/"+file+"' could not be found.",
                index: node.start+7
            }, originalCode);
        }

        extendsChain.push(config.directory+"/"+file);

        var contents = fs.readFileSync(config.directory+"/"+file);

        if (!contents) {
            throw err.EvalError({
                msg: "Extended file '"+config.directory+"/"+file+"' could not be read.",
                index: node.start+7
            }, originalCode);
        }

        var input = contents.toString();

        var extendedAST = parsers[config.sourceLanguage].parse(input);

        if (extendedAST.imports) {
            extendedAST.imports.map(evalExpr);
        }

        var childExtendNode = checkExtends(extendedAST);
        if (childExtendNode !== false) {
            return evalExtend(extendedAST, childExtendNode);
        }
        return extendedAST.contents.map(evalExpr).join("");
    }

    function evalAssignment(node) {

        var recursiveRefs = checkForReferences(node.rightSide, node.leftSide.value);
        if (recursiveRefs.length > 0) {
            throw err.EvalError({
                msg: "Recursive assignment of '"+node.leftSide.value+"' detected. Recursion is not allowed in Toast templates.",
                index: node.start
            }, originalCode)
        }

        if (node.override) {
            scope.add(node.leftSide.value, node.rightSide,true);
        } else {
            scope.add(node.leftSide.value, node.rightSide);
        }
        return "";
    }

    function evalMacroDefinition(node) {
        scope.add(node.name.value, {params: node.params, body: node.body});
        return "";
    }
    function evalBoolean(node) {
        return node.value === "true";
    }
    function evalNumber(node) {
        return parseInt(node.value);
    }
    function evalString(node) {
        return node.value;
    }
    function evalRange(node) {
        var arr = [];
        var start = evalExpr(node.startIndex);
        var end = evalExpr(node.endIndex);
        if (typeof start !== "number") {
            throw new TypeError("Start index of range must resolve to a number.");
        }
        if (typeof end !== "number") {
            throw new TypeError("End index of range must resolve to a number.");
        }
        if (start < end) {
            for (var i=start; i<=end; i++) {
                arr.push(i);
            }
        } else if (start > end) {
            for (var i=start; i>=end; i--) {
                arr.push(i);
            }
        } else {
            arr.push(start);
        }
        return arr;
    }
    function evalArray(node) {
        var arr = [];
        for (var i=0; i<node.elements.length; i++) {
            arr.push(evalExpr(node.elements[i]));
        }
        return arr;
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
                    tmp = escapeHTML(tmp);
                }
                inner += tmp;
            }

            if (node.filters) {
                for (var i=0; i<node.filters.length; i++) {
                    var filterArgs = [];
                    for (var j=0; j<node.filters[i].arguments.length; j++) {
                        filterArgs.push([node.filters[i].arguments[j]].map(evalExpr).join(""))
                    }
                    inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
                }
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
            for (var j=0; j<node.filters[i].arguments.length; j++) {
                filterArgs.push([node.filters[i].arguments[j]].map(evalExpr).join(""));
            }
            inner = applyFilter(node.filters[i],inner,filterArgs,originalCode);
        }
        return inner;
    }
    function evalIfStatement(node) {
        var pred = evalExpr(node.predicate);
        pred = pred === "false" ? false : (pred === "true" ? true : pred);

        scope.open();
        if (pred === true) {
            var out = node.thenCase.map(evalExpr).join("");
            scope.close();
            return out;
        } else if (pred === false) {
            if (node.elifCases) {
                for (var i=0; i<node.elifCases.length; i++) {
                    pred = evalExpr(node.elifCases[i].predicate);
                    if (pred) {
                        var out = node.elifCases[i].thenCase.map(evalExpr).join("");
                        scope.close();
                        return out;
                    }
                }
            }
            if (node.elseCase) {
                var out = node.elseCase.map(evalExpr).join("");
                scope.close();
                return out;
            } else {
                scope.close();
                return "";
            }
        } else {
            throw Error("Condition in if statement must evaluate to a boolean.");
        }
    }
    function evalForEach(node) {
        var idx;
        var iterator;
        if (node.iterator.value === "self__") {
            //This applies to languages like Dust, where we iterate over an array without declaring a new
            //variable to refer to the current item. Instead, all properties of the current item are just added
            //to the top of the scope at the beginning of each loop.
            iterator = false;
        } else {
            iterator = node.iterator.value;
        }
        var data = evalExpr(node.data);

        var output = [];

        for (idx = 0; idx < data.length; idx++) {
            scope.open();

            if (iterator) {
                scope.add(iterator, data[idx]);
            } else {
                //Without an iterator object, we just add each property of
                //the current element to the scope as its own value.
                if (__.typeOf(data[idx]) === "Object") {
                    var keys = Object.keys(data[idx]);
                    for (var i=0; i<keys.length; i++) {
                        scope.add(keys[i], {
                            kind: "Raw",
                            value: data[idx][keys[i]]
                        });
                    }
                } else {
                    scope.add("self__", data[idx]);
                }
            }

            for (var j=0; j<node.body.length; j++) {
                output.push(evalExpr(node.body[j]));
            }

            scope.close();
        }

        if (node.elseCase && data.length === 0) {
            scope.open();
            output.push(node.elseCase.map(evalExpr).join(""));
            scope.close();
        }

        return output.join("");
    }
    function evalInterpolation(node) {
        var val = scope.find(node.name.value);
        var output;

        if (!val) {
            if (node.arguments.length > 0) {
                throw Error("Could not evaluate undefined macro '"+node.name.value+"'. Current scope is: "+scope.state());
            } else {
                // TODO: figure out if this is what I want here
                // currently, val is undefined, but we want to
                // know if the filter "defined" or "undefined" is
                // applied, since then we can return a boolean
                // rather than throwing an error
                if (node.filters && node.filters.length > 0) {
                    if (node.filters[0].name.value==="undefined" ||
                        node.filters[0].name.value==="defined") {
                        output = applyFilter(node.filters[0],val,[],originalCode);
                        return output;
                    }
                }

                throw Error("Could not evaluate undefined variable '"+node.name.value+"' in file: "+config.file+" at position "+node.start+"->"+node.end);
            }

        } else {

            //Handle modifiers
            //   i.e. for "person.name", val="person" right now, so
            //        we need to traverse through the person object
            var name = node.name.value;
            if (node.name.modifiers) {
                // val = val.values;
                for (var i=0; i<node.name.modifiers.length; i++) {
                    var m = node.name.modifiers[i];

                    //just used for error printing
                    name += ("["+m.value.value+"]");

                    var key = m.value.kind==="Number" ?
                                parseInt(m.value.value) : m.value.value;

                    if (!val[key]) {
                        throw Error("Object '"+name+"' is not defined. val is "+JSON.stringify(val,null,4));
                    }
                    val = val[key]
                }
            }
        }

        if (val.params) {
            if (val.params.length !== node.arguments.length) {
                throw Error("Incorrect number of arguments given to macro '"+
                            node.name.value+"'. Expected "+val.params.length+
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
                for (var j=0; j<node.filters[i].arguments.length; j++) {
                    filterArgs.push( [node.filters[i].arguments[j]].map(evalExpr).join("") )
                }
                output = applyFilter(node.filters[i],output,filterArgs,originalCode);
            }
        }
        return output;
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
        return "";
    }
    function evalCommentHTML(node) {
        return "<!--"+node.value+"-->";
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
                return node;
                // throw EvalError("No case for kind "+node.kind+" "+JSON.stringify(node));
        }
    }

    var extendNode = checkExtends(ast);
    if (extendNode !== false) {
        return evalExtend(ast, extendNode);
    }
    if (ast.imports) {
        ast.imports.map(evalExpr);
    }
    return ast.contents.map(evalExpr).join("");
}


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
        out += " = "+evalExpr(node.body);
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


module.exports = evaluators;
module.exports.af = applyFilter;
module.exports.mergeAttributes = mergeAttributes;