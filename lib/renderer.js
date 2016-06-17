var fs = require('fs')
var marked = require('marked')
var mkdirp = require('mkdirp')
var omeletParser = require('./parser.js')
var evaluate = require('./evaluate.js')
var preprocessor = require('./preprocessor.js')
var beautify = require('js-beautify').html

function Renderer(options) {
    var self = this
    var sourceLanguage = options.sourceLanguage || 'omelet'
    var targetLanguage = 'html'
    var prettyPrint = options.prettyPrint || true
    var permalinks = options.permalinks || false
    var outputDirectory = options.outputDirectory || '.'

    this.readFileContents = function(filePath) {
        var contents = ''
        if (fs.lstatSync(filePath).isFile()) {
            contents = fs.readFileSync(filePath).toString()
        }
        return contents
    }

    this.getOutputFilePath = function(inputFilePath, parser) {
        if (parser === 'copy') {
            return outputDirectory + inputFilePath
        }
        var inputFilePathNoExt = inputFilePath.substring(0, inputFilePath.lastIndexOf('.'))
        var out = outputDirectory + inputFilePathNoExt
        if (permalinks && inputFilePathNoExt.lastIndexOf('/index') !== inputFilePathNoExt.length - 6) {
            return out + '/index.html'
        }
        return out + '.html'
    }

    this.writeFile = function(outputFilePath, output) {
        var pathWithoutFile = outputFilePath.substring(0, outputFilePath.lastIndexOf('/'))
        // make all necessary directories, if they don't exist
        mkdirp(pathWithoutFile, function(perr) {
            if (perr) { return console.error(perr) }
            fs.writeFile(outputFilePath, output, function(err) {
                if (err) { return console.log(err) }
                console.log('File "' + outputFilePath + '" written successfully.')
            })
        })
    }

    this.renderString = function(input, parser, context, inputFilePath) {
        context = context || {}

        var output = ''

        if (parser === 'omelet') {
            input = preprocessor.preprocess(input)

            var ast = omeletParser.parse(input)

            output = evaluate(ast, input, context, {
                directory: inputFilePath.substring(0, inputFilePath.lastIndexOf('/')),
                file: inputFilePath,
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                isWeb: false
            })

            if (prettyPrint) {
                output = beautify(output, {
                    indent_size: 4,
                    indent_inner_html: true,
                    extra_liners: []
                })
            }
        } else if (parser === 'markdown') {
            output = marked(input)
        } else {
            // TODO/NOTE: here is where we'll handle special parsers (e.g. Markdown)
            output = input
        }

        var outputFilePath = self.getOutputFilePath(inputFilePath, parser)

        self.writeFile(outputFilePath, output)

        return output
    }

    this.copyBytes = function(data, inputFilePath) {
        var outputFilePath = self.getOutputFilePath(inputFilePath, 'copy')
        self.writeFile(outputFilePath, data)
    }

    this.renderFile = function(inputFilePath, context) {
        context = context || {}
        var input = self.readFileContents(inputFilePath)
        return self.renderString(input, context, inputFilePath)
    }

    this.renderDirectory = function(pathToDirectory, context) {
        if (fs.lstatSync(pathToDirectory).isDirectory()) {
            fs.readdir(pathToDirectory, function(err, fileNames) {
                if (err) {
                    console.error(err)
                    return
                }

                fileNames = fileNames.filter(function(name) {
                    return name.charAt(0) !== '.'
                })

                fileNames.forEach(function(fileName) {

                    var inFilePath = pathToDirectory + '/' + fileName

                    if (fs.lstatSync(inFilePath).isFile()) {
                        self.renderFile(inFilePath, context)
                    }
                })
            })
        } else {
            throw Error(pathToDirectory + ' is not a directory!')
        }
    }
}

module.exports.Renderer = Renderer
