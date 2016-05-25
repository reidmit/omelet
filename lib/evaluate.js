/*
 * Render a Toast AST into HTML
 */

var __ = require('./util.js');
var ast = require('./ast.js');
var fs = require('fs');
var parser = require('./parser.js');
var err = require('./errors.js');
var filters = require('./filters.js');
var evaluate = require('./evaluate.js');
var indentation = require('./indentation.js');
var visitor = require('./visitor.js');
var renderer = require('./renderer.js');

var html_elements = {
    void: __.toMap("area,base,br,col,embed,hr,img,input,keygen,link,meta,param,source,track,wbr"),
    raw: __.toMap("script,style"),
    escapableraw: __.toMap("textarea,title")
}

function Scope() {
    var env = [{}];
    var files = {};
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
                throw Error("Variable '"+key+"' is already defined in this scope.");
            }
        }
        env[0][key] = {value: value, override: !!override};
    }
    this.addFile = function(fileName,fileData) {
        if (files[fileName]) {
            throw Error("A file named '"+fileName+"' is already in scope.");
        }
        files[fileName] = fileData;
    }
    this.addAll = function(obj) {
        var keys = Object.keys(obj);
        for (var i=0; i<keys.length; i++) {
            if (keys[i].indexOf("/") === 0)
                this.addFile(keys[i], obj[keys[i]]);
            else
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
    this.findFile = function(fileName) {
        return files[fileName];
    }
    this.findFilesMatching = function(regex) {
        var keys = Object.keys(files);
        var pattern = new RegExp(regex);
        var matches = [];
        for (var i=0; i<keys.length; i++) {
            if (pattern.test(keys[i])) {
                matches.push(files[keys[i]])
            }
        }
        return matches;
    }

    this.files = function() { return files; }
    this.data = function() { return env; }
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
    return input.replace(/\&/g, "&amp;")
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

/*
* Finds the proper relative path from one Omelet link
* to another. For example, if we're evaluating the file
* /posts/post1 and it contains an interpolated reference
* to /index, we'll need to return ../index
*/
function getRelativePath(from,to) {
    if (from.indexOf("/") !== 0) {
        throw Error("Omelet relative paths should start with a '/', "+
                    "but none found in "+from);
    } else if (to.indexOf("/") !== 0) {
        throw Error("Omelet relative paths should start with a '/', "+
                    "but none found in "+to);
    }
    return from.replace(/\/[^\/]+$/, "").replace(/\/[^\/]+/g, "/..")+to;
}

module.exports = function(ast, originalCode, context, config) {
    if (!ast) {
        return console.error("Evaluation error:","Cannot evaluate an undefined AST.");
    }

    var outputDirectory = "ignored/outputs";

    var rndr = new renderer.Renderer({
        prettyPrint: true,
        outputDirectory: outputDirectory
    });

    var scope = new Scope();
    scope.addAll(context);

    var extendsChain = [];
    var includesChain = [];

    function evalParenthetical(node) {
        return node.inner.map(evalExpr).join("");
    }

    function evalInclude(node) {
        var file = evalExpr(node.file);

        var input;

        var inScope = scope.findFile(file);

        if (inScope) {

            input = inScope.contents;

        } else {

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

            input = contents.toString();

        }

        input = indentation.preprocess(input);

        try {
            var includedAST = parser.parse(input);
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
        var file = evalExpr(node.file);

        var input;

        var inScope = scope.findFile(file);

        if (inScope) {
            // We have the file contents in scope, so just grab them from
            // there.
            input = inScope.contents;
        } else {
            // We need to look at the filesystem for the referenced file,
            // and throw an error if we don't find it.
            try {
                var stats = fs.lstatSync(config.directory+"/"+file);
                if (stats.isDirectory()) {
                    throw err.EvalError({
                        msg: "Imported file '"+config.directory+"/"+file+"' is a directory.",
                        index: node.start
                    }, originalCode);
                }
            } catch (e) {
                throw err.EvalError({
                    msg: "Imported file '"+config.directory+"/"+file+"' could not be found.",
                    index: node.start
                }, originalCode);
            }

            var contents = fs.readFileSync(config.directory+"/"+file);

            if (!contents) {
                throw err.EvalError({
                    msg: "Imported file '"+config.directory+"/"+file+"' could not be read.",
                    index: node.start
                }, originalCode);
            }

            input = contents.toString();
        }

        input = indentation.preprocess(input);

        var importedAST = parser.parse(input);

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

            var otherFileName;
            if (!config.isWeb) {
                otherFileName = config.directory+"/"+rootFile;
            } else {
                otherFileName = rootFile;
            }

            if (extendsChain.indexOf(otherFileName) > -1) {
                throw err.EvalError({
                    msg: "Template inheritance loop detected. File '"+otherFileName+
                         "' has already been extended earlier in the inheritance chain.",
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
        var input;

        var inScope = scope.findFile(file);

        if (inScope) {

            input = inScope.contents;

        } else {

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

            input = contents.toString();
        }

        input = indentation.preprocess(input);

        var extendedAST = parser.parse(input);

        if (extendedAST.imports) {
            extendedAST.imports.map(evalExpr);
        }

        var childExtendNode = checkExtends(extendedAST);
        if (childExtendNode !== false) {
            return evalExtend(extendedAST, childExtendNode);
        }

        return extendedAST.contents.map(evalExpr).join("");
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
        return node.value.replace(/\n[ ]+/g, "\n");
    }

    function evalIdentifier(node) {
        var val = scope.find(node.value);

        var name = node.value;
        if (node.modifiers) {
            // val = val.values;
            for (var i=0; i<node.modifiers.length; i++) {
                var m = node.modifiers[i];

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

        if (val) {
            return evalExpr(val);
        } else {
            //new
            return undefined;
        }
        // return node.value;
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

            s += inner.trim();
            s += "</"+tagName+">";
        }

        //And close the scope again
        scope.close();

        return s;
    }

    function evalIfStatement(node) {
        var pred = evalExpr(node.predicate);
        var predIsFalsy = (pred === false || typeof pred === 'undefined' || pred === null);
        if (node.negated) {
            predIsFalsy = !predIsFalsy;
        }

        scope.open();
        if (predIsFalsy) {
            if (node.elifCases) {
                for (var i=0; i<node.elifCases.length; i++) {
                    pred = evalExpr(node.elifCases[i].predicate);
                    var elifPredIsTruthy = !(pred === false || typeof pred ==='undefined' || pred === null);
                    if (node.elifCases[i].negated) {
                        elifPredIsTruthy = !elifPredIsTruthy;
                    }

                    if (elifPredIsTruthy) {
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
            var out = node.thenCase.map(evalExpr).join("");
            scope.close();
            return out;
        }
    }
    function evalForEach(node) {
        var idx;
        var iterator = node.iterator.value;
        var data = evalExpr(node.data);

        if (data === false || typeof data ==='undefined' || data === null) {
            data = [];
        } else if (__.isString(data) && data.indexOf("/")===0) {
            // we're iterating over the contents of a directory
            var files = scope.findFilesMatching(data);

            data = [];
            for (var i=0; i<files.length; i++) {
                var input = indentation.preprocess(files[i].contents);
                var fileAST = parser.parse(input);
                var fileDefs = {
                    $contents: files[i].contents,
                    $path: files[i].filePath
                }
                for (var j=0; j<fileAST.contents.length; j++) {
                    var defNode = fileAST.contents[j];
                    if (defNode.kind === "MacroDefinition"
                        && defNode.params.length === 0) {
                        // we only add to scope defs with no params
                        fileDefs[defNode.name.value] = defNode.body.map(evalExpr).join("");
                    }
                }
                data.push(fileDefs);
            }
        } else if (!__.isArray(data)) {
            data = [data];
        }

        var output = [];

        for (idx = 0; idx < data.length; idx++) {
            scope.open();

            scope.add(iterator, data[idx]);

            scope.add("$loop", {
                index: idx,
                count: idx+1,
                total: data.length
            });

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
        var output;

        if (node.name.value.indexOf("/") === 0) {
            // We have an Omelet path in an interpolation,
            // so we should return a relative path that goes
            // to the right place
            output = getRelativePath(config.file, node.name.value);

        } else {
            var val = scope.find(node.name.value);

            if (!val) {
                if (node.arguments.length > 0) {
                    throw Error("Could not evaluate undefined macro '"+node.name.value+"'. Current scope is: "+scope.state());
                } else {
                    throw Error("Could not evaluate undefined variable '"+node.name.value+"' in file: "+config.file);
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
                    scope.add(val.params[i].value, evalExpr(node.arguments[i]));
                }
                var body;
                if (__.isArray(val.body)) {
                    body = val.body.map(evalExpr).join("");
                } else {
                    body = evalExpr(val.body);
                }

                scope.close();

                output = body;
            } else {
                output = evalExpr(val);
            }

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
                return "<!doctype html>";
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
            case "Parenthetical":
                return evalParenthetical(node);
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
