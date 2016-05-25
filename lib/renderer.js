var fs = require('fs');
var omeletParser = require('./parser.js');
var evaluate = require('./evaluate.js');
var indentation = require('./indentation');
var beautify = require('js-beautify').html;
var __ = require('./util.js');

var Renderer = function(options) {
    var self = this;
    var sourceLanguage = options.sourceLanguage || "omelet";
    var targetLanguage = "html";
    var prettyPrint = options.prettyPrint || true;
    var outputDirectory = options.outputDirectory || ".";

    this.readFileContents = function(filePath) {
        var contents = "";
        if (fs.lstatSync(filePath).isFile()) {
            contents = fs.readFileSync(filePath).toString();
        }
        return contents;
    }

    this.getOutputFilePath = function(inputFilePath, prettyPermalinks) {
        var lastDot = inputFilePath.lastIndexOf(".");
        if (lastDot > -1) {
            return outputDirectory+inputFilePath;
        } else {
            if (prettyPermalinks)
                return outputDirectory+inputFilePath+"/index.html"
            return outputDirectory+inputFilePath+".html"
        }
    }

    this.writeFile = function(outputFilePath, output) {
        fs.writeFile(outputFilePath, output, function(err) {
            if (err) return console.log(err);
            console.log("File '"+outputFilePath+"' written successfully.");
        });
    }

    this.renderString = function(input, parser, context, inputFilePath, prettyPermalinks) {
        context = context || {};

        var output = "";

        if (parser === "omelet") {
            input = indentation.preprocess(input);

            var ast = omeletParser.parse(input);

            output = evaluate(ast, input, context, {
                directory: inputFilePath.substring(0,inputFilePath.lastIndexOf("/")),
                file: inputFilePath,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                isWeb: false
            });


            if (prettyPrint) {
                output = beautify(output, {
                    indent_size: 4,
                    indent_inner_html: true,
                    extra_liners: []
                });
            }
        } else {
            // TODO/NOTE: here is where we'll handle special parsers (e.g. Markdown)
            output = input;
        }

        var outputFilePath = self.getOutputFilePath(inputFilePath, prettyPermalinks);

        self.writeFile(outputFilePath, output);

        return output;
    }

    this.renderFile = function(inputFilePath, context) {
        context = context || {};
        var input = self.readFileContents(inputFilePath);
        return self.renderString(input, context, inputFilePath);
    }

    this.renderDirectory = function(pathToDirectory, context) {
        if (fs.lstatSync(pathToDirectory).isDirectory()) {
            fs.readdir(pathToDirectory, function(err, fileNames) {
                if (err) {
                    console.error(err);
                    return;
                };

                fileNames = fileNames.filter(function(name) {
                    return name.charAt(0) !== ".";
                })

                fileNames.forEach(function(fileName) {

                    var inFilePath = pathToDirectory+"/"+fileName;

                    if (fs.lstatSync(inFilePath).isFile()) {
                        self.renderFile(inFilePath, context);
                    }
                })
            });
        } else {
            throw Error(pathToDirectory+" is not a directory!")
        }
    }
}

module.exports.Renderer = Renderer;
