var fs = require('fs');
var open = require('open');
var chokidar = require('chokidar');
var program = require('commander');
var parsers = require('./parsers.js');
var evaluators = require('./evaluators.js');
var errors = require('./errors.js');
var indentation = require('./indentation');
var extensions = require('./extensions.js');
var beautify = require('js-beautify').html;
var __ = require('./util.js');
var visitor = require('./visitor.js');

program
    .version("0.0.1")
    .option("-i, --input <path>", "Input file or directory")
    .option("-o, --output <path>", "Output directory")
    .option("-s, --source <language>", "Source language")
    .option("-t, --target <language>", "Target language")
    .option("-d, --direct <string>", "Compile an input string directly")
    .option("-w, --watch", "Watch the input file/directory for changes")
    .option("--ast", "Print the AST without evaluating")
    .parse(process.argv);

var noEval = false;

if (process.argv.length <= 2) {
    program.help();
    return;
}

if (!program.source) {
    console.error("\nYou must specify a source language.");
    program.help();
    return;
}

if (!program.target) {
    console.error("\nYou must specify a target language.");
    program.help();
    return;
}

var prettyPrint = true;

var inputPath = program.input;
var inputString = program.direct;
var outputPath = program.output;
var sourceLanguage = program.source;
var targetLanguage = program.target;

var context = {
    name: "Reid",
    count: 47,
    friends: [
        { name: "Moe", age: 37 },
        { name: "Larry", age: 39 },
        { name: "Curly", age: 35 }
    ],
    "tags": [],
    "likes": ["moe", "larry", "curly", "shemp"]
};

if (inputString) {
    var ast = parsers[sourceLanguage].parse(inputString);
    if (ast.status === false) throw errors.ParseError(ast,text);
    __.printAST(ast);

    var output = evaluators[targetLanguage](ast.value, inputString, context, {
        directory: "command line",
        file: "command line"
    });
    if (prettyPrint) {
        output = beautify(output, {indent_size: 4, indent_inner_html: true, extra_liners: []});
    }
    console.log(output);
    return;
}

var watcher;

if (program.watch) {
    watcher = chokidar.watch(inputPath,{});
    var log = console.log.bind(console);
    watcher.on('all', parseFiles);
}

function parseFiles() {

    if (fs.lstatSync(inputPath).isDirectory()) {

        fs.readdir(inputPath, function(err, fileNames) {
            if (err) {
                console.error(err);
                return;
            };

            fileNames = fileNames.filter(function(name) {
                return name.charAt(0) !== ".";
            })

            fileNames.forEach(function(fileName) {

                var inFilePath = inputPath+"/"+fileName;

                if (fs.lstatSync(inFilePath).isFile()) {

                    fs.readFile(inFilePath, function(err, contents) {
                        if (err) throw err;

                        var text = contents.toString();
                        var input = text;

                        var ast = parsers[sourceLanguage].parse(input);

                        console.log(JSON.stringify(ast,null,4));

                        if (ast.status === false) throw errors.ParseError(ast,text);
                        __.printAST(ast);

                        if (noEval) {
                            return;
                        }

                        //NOTE: sort out ast vs. ast.value, etc (different parsers...)

                        var output = evaluators[targetLanguage](ast, input, context, {
                            directory: inputPath,
                            file: fileName,
                            sourceLanguage: sourceLanguage,
                            targetLanguage: targetLanguage
                        });
                        if (prettyPrint && targetLanguage==="html") {
                            output = beautify(output, {indent_size: 4, indent_inner_html: true, extra_liners: []});
                        }

                        var outFilePath = outputPath+"/"
                                            +fileName.substring(0,fileName.lastIndexOf("."))
                                            +"."+extensions.for(targetLanguage);
                        fs.writeFile(outFilePath, output, function(err) {
                            if (err) return console.log(err);
                            //TODO: shouldn't say this if we had a SyntaxError
                            console.log("File '"+outFilePath+"' written successfully.");
                            console.log(output);
                            console.log("------------------");
                        });

                    });
                }
            })
        });

    } else if (fs.lstatSync(inputPath).isFile()) {
        fs.readFile(inputPath, function(err, contents) {
            if (err) throw err;

            var input = contents.toString();

            try {
                var ast = parsers[sourceLanguage].parse(input);
            } catch (e) {
                throw errors.ParseError(inputPath, e);
            }

            __.printAST(ast);

            // visitor.visit(ast);

            var output = evaluators[targetLanguage](ast, input, context, {
                directory: inputPath.substring(0,inputPath.lastIndexOf("/")),
                file: inputPath,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage
            });

            // if (prettyPrint) {
            //     output = beautify(output, {indent_size: 4, indent_inner_html: true, extra_liners: []});
            // }

            var outFilePath = outputPath+"/"
                                        +inputPath.substring(
                                            inputPath.lastIndexOf("/")+1,inputPath.lastIndexOf("."))
                                        +"."+extensions.for(targetLanguage);

            fs.writeFile(outFilePath, output, function(err) {
                if (err) return console.log(err);
                //TODO: shouldn't say this if we had a SyntaxError
                console.log("File '"+outFilePath+"' written successfully.");
                console.log("----------------");
                console.log(output);
            });

        });
    }
}

parseFiles();