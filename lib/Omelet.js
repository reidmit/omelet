var renderer = require('./renderer.js')
var parser = require('./parser.js')
var compiler = require('./compiler.js')
var indentation = require('./indentation.js')
var __ = require('./util.js')

module.exports = function(options) {
    var outputDirectory = options.outputDirectory
    var context = options.context || {}
    var permalinks = options.permalinks

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
                    // var o = rd.renderString(file.contents.toString(), file.parser, context, file.filePath)
                    // console.log('\nOMELET OUTPUT:\n'+o+'\n');
                    console.time("preprocessing")
                    var input = indentation.preprocess(file.contents.toString())
                    console.timeEnd("preprocessing")

                    console.log("\nPARSED AST:\n")
                    console.time("parsing")
                    var ast = parser.parse(input)
                    console.timeEnd("parsing")
                    __.printAST(ast)
                    console.log("\nOUTPUT:")
                    console.time("compilation")
                    var fun = compiler.compile(ast)
                    console.timeEnd("compilation")
                    console.log("\n")
                    console.log(fun)
                    console.log("\n")
                } else {
                    rd.copyBytes(file.contents, file.filePath)
                }
            }

        })

    }
}