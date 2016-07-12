var lexer = require('./lexer.js')
var parser = require('./parser.js')
var compiler = require('./compiler.js')
var linker = require('./linker.js')
var fs = require('fs')
var path = require('path')
var __ = require('./util.js')

module.exports.compile = function(inputFile, options) {
    var debug = false

    // try {
        console.time('reading file')
        var str = fs.readFileSync(inputFile, 'utf8')
        console.timeEnd('reading file')

        options = {
            source: str,
            fileName: path.basename(inputFile),
            filePath: inputFile,
            prettyPrint: true,
            modes: {
                uppercase: function(str) {
                    return str.toUpperCase()
                },
                bad: 'hello!'
            }
        }

        console.time('lexing')
        var tokens = lexer.lex(str, options)
        console.timeEnd('lexing')

        if (debug) {
            console.log('TOKENS:')
            console.log(tokens)
        }

        console.time('parsing')
        var ast = parser.parse(tokens, options)
        console.timeEnd('parsing')

        if (debug) {
            console.log('ORIGINAL:')
            __.printAST(ast)
        }

        console.time('linking')
        ast = linker.link(ast, options)
        console.timeEnd('linking')

        if (debug) {
            console.log('LINKED:')
            __.printAST(ast)
        }
        console.time('compiling')
        var fn = compiler.compile(ast, options)
        console.timeEnd('compiling')

        if (debug) {
            console.log(fn.toString())
        }
        return function(data) {
            return fn(data)
        }

    // } catch (e) {
    //     throw e
    // }
}
