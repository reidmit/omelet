var fs = require('fs')
var path = require('path')
var lexer = require('../lib/lexer.js')
var parser = require('../lib/parser.js')
var linker = require('../lib/linker.js')
var compiler = require('../lib/compiler.js')

function sourceToTemplate(source, options) {
    var tokens = lexer.lex(source, options),
        ast = parser.parse(tokens, options),
        linkedAst = linker.link(ast, options),
        template = compiler.compile(linkedAst, options)
    return template
}

function optionsWithDefaults(options) {
    return {
        filePath: options.filePath || undefined,
        fileName: options.fileName || undefined,
        source: options.source || undefined,

        stripComments: options.stripComments || false,
        indentSize: options.indentSize || 2,
        indentChar: options.indentChar || ' ',
        templateName: options.templateName || '',
        extension: options.extension || 'html',
        modes: options.modes || {}
    }
}

module.exports = {

    compile: function(source, options) {
        options = options || {}
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)
    },

    compileFile: function(filePath, options) {
        options = options || {}
        var source = fs.readFileSync(filePath, 'utf8')
        options.filePath = filePath
        options.fileName = path.basename(filePath)
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)
    },

    render: function(source, context, options) {
        options = options || {}
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)(context)
    },

    renderFile: function(filePath, context, options) {
        options = options || {}
        var source = fs.readFileSync(filePath, 'utf8')
        options.filePath = filePath
        options.fileName = path.basename(filePath)
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)(context)
    }
}
