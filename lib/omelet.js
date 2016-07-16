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

        // -o, --output-dir <path>
        outputDir: options.outputDir ||
                        options.filePath ?
                            path.dirname(options.filePath) :
                            '.',

        // -w, --watch
        watch: options.watch || false,

        // -s, --strip-comments
        stripComments: options.stripComments || false,

        // -p, --pretty-print
        prettyPrint: options.prettyPrint || false,

        // -i, --indent-size <n>
        indentSize: options.indentSize || 2,

        // -C, --indent-char <char>
        indentChar: options.indentChar || ' ',

        // -n, --template-name <name>
        templateName: options.templateName || 'template',

        // -m, --minify
        minify: options.minify || false,

        // -e, --extension,
        extension: options.extension || 'html',

        // -M, --modes <path/to/modes.js>
        modes: options.modes || {},

        // -c, --context <path/to/context.json>
        context: options.context || {}

    }
}

module.exports = {

    cache: {},

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

    render: function(source, options) {
        options = options || {}
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)(options.context)
    },

    renderFile: function(filePath, options) {
        options = options || {}
        var source = fs.readFileSync(filePath, 'utf8')
        options.filePath = filePath
        options.fileName = path.basename(filePath)
        options.source = source
        options = optionsWithDefaults(options)
        return sourceToTemplate(source, options)(options.context)
    }
}