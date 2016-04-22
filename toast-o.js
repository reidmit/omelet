var fs = require('fs');
var parsers = require('./parsers.js');
var evaluators = require('./evaluators.js');
// var indentation = require('./indentation');
var extensions = require('./extensions.js');
var beautify = require('js-beautify').html;
var __ = require('./util.js');

var fileStoragePrefix = "__TOAST__IDE__file__:";
var fileStorageCurrent = "__TOAST__IDE__latest__";

var Toast = function(options) {
    var self = this;
    var sourceLanguage = options.sourceLanguage;
    var targetLanguage = options.targetLanguage;
    var prettyPrint = options.prettyPrint;
    var outputDirectory = options.outputDirectory || ".";
    var isWeb = !!options.isWeb;

    var parser = parsers[sourceLanguage];
    var evaluate = evaluators[targetLanguage];

    this.readFileContents = function(filePath) {
        var contents = "";
        if (!isWeb) {
            if (fs.lstatSync(filePath).isFile()) {
                contents = fs.readFileSync(filePath).toString();
            }
        } else {
            throw Error("Web IDE cannot read from filesystem.");
        }
        return contents;
    }

    this.getOutputFilePath = function(inputFilePath) {
        if (!isWeb) {
            return outputDirectory+"/"+
                    inputFilePath.substring(
                    inputFilePath.lastIndexOf("/")+1,
                    inputFilePath.lastIndexOf("."))+
                    "."+extensions.for(targetLanguage);
        } else {
            throw Error("Web IDE not yet supported.");
        }
    }

    this.writeFile = function(outputFilePath, output) {
        if (!isWeb) {
            fs.writeFile(outputFilePath, output, function(err) {
                if (err) return console.log(err);
                console.log("File '"+outputFilePath+"' written successfully.");
            });
        } else {
            throw Error("Web IDE cannot write to filesystem.");
        }
    }

    this.renderString = function(input, context, inputFilePath) {
        context = context || {};
        var ast = parsers[sourceLanguage].parse(input);
        // var astString = __.printAST(ast);
        var output = "";
        if (!isWeb) {
            output = evaluate(ast, input, context, {
                directory: inputFilePath.substring(0,inputFilePath.lastIndexOf("/")),
                file: inputFilePath,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                isWeb: false
            });
        } else {
            output = evaluate(ast, input, context, {
                directory: "/",
                file: inputFilePath,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                isWeb: true
            });
        }

        if (prettyPrint) {
            output = beautify(output, {
                indent_size: 2,
                indent_inner_html: true,
                extra_liners: []
            });
        }

        if (!isWeb)
            self.writeFile(self.getOutputFilePath(inputFilePath), output);
        return output;
    }

    this.renderFile = function(inputFilePath, context) {
        context = context || {};
        var input = self.readFileContents(inputFilePath);
        return self.renderString(input, context, inputFilePath);
    }
}

module.exports.Toast = Toast;
