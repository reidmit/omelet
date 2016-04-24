/*
 * Render a Toast AST into HTML
 * Written by Reid Mitchell, Jan.-Apr. 2016
 *
 * Toast: https://github.com/reid47/toast
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

    var scope = new evaluators.Scope();
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

        var input;

        if (!config.isWeb) {
            if (includesChain.indexOf(config.directory+"/"+file) > -1) {
                throw err.EvalError({
                    msg: "Template inclusion loop detected. File '"+config.directory+"/"+file
                         +"' has already been included earlier in the includes chain."
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

            input = contents.toString();

        } else {
            if (includesChain.indexOf(file) > -1) {
                throw err.EvalError({
                    msg: "Template inclusion loop detected. File '"+file
                         +"' has already been included earlier in the includes chain."
                }, originalCode)
            }

            includesChain.push(file);

            var contents = localStorage.getItem(fileStoragePrefix+file);

            if (contents === null) {
                throw EvalError("Included file '"+file+"' could not be found.");
            }

            input = contents;
        }

        //TODO: generalize this
        if (indentation.isIndentedLanguage(config.sourceLanguage)) {
            input = indentation.preprocess(input);
        }

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
        var file = evalExpr(node.file);
        var input;

        if (!config.isWeb) {
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
        } else {
            var contents = localStorage.getItem(fileStoragePrefix+file);

            if (contents === null) {
                throw EvalError("Imported file '"+file+"' could not be found.");
            }

            input = contents;
        }

        //TODO: generalize this
        if (indentation.isIndentedLanguage(config.sourceLanguage)) {
            input = indentation.preprocess(input);
        }

        var importedAST = parsers[config.sourceLanguage].parse(input);
        console.log("importedAST is ...");
        __.printAST(importedAST);

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

        if (!config.isWeb) {
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
        } else {
            var contents = localStorage.getItem(fileStoragePrefix+file);
            if (contents === null) {
                throw EvalError("Extended file '"+file+"' could not be found.");
            }
            extendsChain.push(file);
            input = contents;
        }

        //TODO: generalize this
        if (indentation.isIndentedLanguage(config.sourceLanguage)) {
            input = indentation.preprocess(input);
        }

        var extendedAST = parsers[config.sourceLanguage].parse(input);

        if (extendedAST.imports) {
            extendedAST.imports.map(evalExpr);
        }

        var childExtendNode = evaluators.checkExtends(extendedAST);
        if (childExtendNode !== false) {
            return evalExtend(extendedAST, childExtendNode);
        }

        console.log("evalextend returning "+extendedAST.contents.map(evalExpr).join(""))
        return extendedAST.contents.map(evalExpr).join("");
    }

    function evalAssignment(node) {

        var recursiveRefs = evaluators.checkForReferences(node.rightSide, node.leftSide.value);
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
        console.log("on macrodef, adding "+JSON.stringify(node));
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
                    tmp = evaluators.escapeHTML(tmp);
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
            inner = evaluators.applyFilter(node.filters[i],inner,filterArgs,originalCode);
        }
        return inner;
    }
    function evalIfStatement(node) {
        var pred = evalExpr(node.predicate);
        var predIsFalsy = (pred === false || typeof pred === 'undefined' || pred === null);
        if (node.negated) {
            predIsFalsy = !predIsFalsy;
        }

        console.log("node.negated is "+node.negated);
        console.log("pred is"+pred);
        console.log("predfalsy is"+predIsFalsy);

        scope.open();
        if (predIsFalsy) {
            if (node.elifCases) {
                for (var i=0; i<node.elifCases.length; i++) {
                    pred = evalExpr(node.elifCases[i].predicate);
                    var elifPredIsTruthy = !(pred === false || typeof pred ==='undefined' || pred === null);
                    if (node.elifCases[i].negated) {
                        elifPredIsTruthy = !elifPredIsTruthy;
                    }
                    console.log("elif.negated is "+node.elifCases[i].negated);
                    console.log("elifpred is "+pred);
                    console.log("elifpredtruthy is "+elifPredIsTruthy);

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

        if (!__.isArray(data)) {
            data = [data];
        } else if (typeof data === "undefined") {
            data = [];
        }

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

        return output.join("\n");
    }
    function evalInterpolation(node) {
        var val = scope.find(node.name.value);
        console.log("tryig to find "+node.name.value+", found "+JSON.stringify(val));
        console.log("and node is "+JSON.stringify(node));
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
                        output = evaluators.applyFilter(node.filters[0],val,[],originalCode);
                        return output;
                    }
                }

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
                scope.add(val.params[i].value,node.arguments[i]);
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
        if (node.filters) {
            for (var i=0; i<node.filters.length; i++) {
                var filterArgs = [];
                for (var j=0; j<node.filters[i].arguments.length; j++) {
                    filterArgs.push( [node.filters[i].arguments[j]].map(evalExpr).join("") )
                }
                output = evaluators.applyFilter(node.filters[i],output,filterArgs,originalCode);
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

    var extendNode = evaluators.checkExtends(ast);
    if (extendNode !== false) {
        return evalExtend(ast, extendNode);
    }
    if (ast.imports) {
        ast.imports.map(evalExpr);
    }
    return ast.contents.map(evalExpr).join("");
}
