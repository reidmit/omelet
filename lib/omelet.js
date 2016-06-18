var renderer = require('./renderer.js')
var parser = require('./parser.js')
var compiler = require('./compiler.js')
var preprocessor = require('./preprocessor.js')
var runtime = require('./runtime.js')

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
