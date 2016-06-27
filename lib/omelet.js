var renderer = require('./renderer.js')
var lexer = require('./lexer.js')
var parser = require('./parser.js')
var compiler = require('./compiler.js')
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

        console.time("parsing")
        var ast = parser.parse(tokens, str)
        console.timeEnd("parsing")

        if (debug) {
            console.log('ORIGINAL:')
            __.printAST(ast)
        }
    } catch (e) {
        throw e
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
