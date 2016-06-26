var renderer = require('./renderer.js')
var lexer = require('./lexer.js')
var parser = require('./parser2.js')
var compiler = require('./compiler.js')
var preprocessor = require('./preprocessor.js')
var linker = require('./linker.js')
var fs = require('fs')
var __ = require('./util.js')

module.exports.compile = function(inputFile, debug) {
    debug = true

    try {
        console.time("reading file")
        var str = fs.readFileSync(inputFile, 'utf8')
        console.timeEnd("reading file")

        console.time("lexing")
        var tokens = lexer.lex(str)
        console.timeEnd("lexing")

        if (debug) {
            console.log("TOKENS:")
            console.log(tokens)
        }

        // console.time("parsing")
        // var ast = parser.parse(tokens, str)
        // console.timeEnd("parsing")

        // if (debug) {
        //     console.log('ORIGINAL:')
        //     __.printAST(ast)
        // }
    } catch (e) {
        console.log(e.message)
    }

    // console.time("linking")
    // ast = linker.link(ast, inputFile)
    // console.timeEnd("linking")

    // if (debug) {
    //     console.log('LINKED:')
    //     __.printAST(ast)
    // }
    // console.time("compiling")
    // var fn = compiler.compile(ast)
    // console.timeEnd("compiling")

    // if (debug) {
    //     console.log(fn.toString())
    // }
    // return function(data) {
    //     return fn(data)
    // }
}

var old = function(options) {
    var outputDirectory = options.outputDirectory || '.'
    var context = options.context || {}
    var permalinks = options.permalinks || false

    this.render = function(fileInfoList) {

        for (var i = 0; i < fileInfoList.length; i++) {
            context[fileInfoList[i].filePath] = fileInfoList[i]
        }

        fileInfoList.forEach(function(file) {
            if (!file.isHidden) {
                var rd = new renderer.Renderer({
                    sourceLanguage: file.parser,
                    outputDirectory: outputDirectory,
                    permalinks: permalinks
                })

                if (file.parser !== 'copy') {
                    console.time('preprocessing')
                    var input = preprocessor.preprocess(file.contents.toString())
                    console.timeEnd('preprocessing')
                    console.time('parsing')
                    var ast = parser.parse(input)
                    console.timeEnd('parsing')
                    // console.log("\nPARSED AST:\n")
                    // __.printAST(ast)
                    console.time('compilation')
                    var fn = compiler.compile(ast)
                    console.timeEnd('compilation')
                    console.log(fn.toString())
                    console.log('\n')
                    console.time('rendering')
                    console.log(fn({}, runtime))
                    console.timeEnd('rendering')

                } else {
                    rd.copyBytes(file.contents, file.filePath)
                }
            }

        })

    }
}
