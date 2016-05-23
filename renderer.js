var fs = require('fs');
var parser = require('./parser.js');
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

    this.getOutputFilePath = function(inputFilePath) {
        return outputDirectory+
               inputFilePath.substring(0,inputFilePath.lastIndexOf("."))+
               ".html";
    }

    this.writeFile = function(outputFilePath, output) {
        fs.writeFile(outputFilePath, output, function(err) {
            if (err) return console.log(err);
            console.log("File '"+outputFilePath+"' written successfully.");
        });
    }

    this.renderString = function(input, context, inputFilePath, outputFilePath) {
        context = context || {};

        input = indentation.preprocess(input);

        var ast = parser.parse(input);

        var output = "";

        output = evaluate(ast, input, context, {
            directory: inputFilePath.substring(0,inputFilePath.lastIndexOf("/")),
            file: inputFilePath,
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage,
            isWeb: false
        });


        if (prettyPrint) {
            output = beautify(output, {
                indent_size: 2,
                indent_inner_html: true,
                extra_liners: []
            });
        }

        console.log("inputFilePath is "+inputFilePath);
        console.log("outputFilePath is "+outputFilePath);

        if (outputFilePath)
            self.writeFile(self.getOutputFilePath(inputFilePath), output);
        else
            self.writeFile(self.getOutputFilePath(inputFilePath), output);

        return output;
    }

    this.renderFile = function(inputFilePath, context) {
        context = context || {};
        var input = self.readFileContents(inputFilePath);
        console.log("reading from :"+inputFilePath);
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
