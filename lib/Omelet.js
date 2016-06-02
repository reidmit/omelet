// var Splitter = require('./split.js');
var renderer = require("./renderer.js");

module.exports = function(options) {
    var cache = options.cacheDirectory || false;
    var outputDirectory = options.outputDirectory;
    var context = options.context || {};
    var prettyPermalinks = options.prettyPermalinks;

    // var splitter = new Splitter(outputDirectory, cache);

    // this.render = function(inputFile) {
    //     if (typeof inputFile === 'undefined')
    //         throw Error("Input file (inputFile option) must be defined");
    //     splitter.splitAndRender(inputFile, context, prettyPermalinks);
    // }
    this.render = function(fileInfoList) {
        fileInfoList.forEach(function(file) {
            // only write files that aren't hidden
            if (!file.isHidden) {
                var rd = new renderer.Renderer({
                    sourceLanguage: file.parser,
                    outputDirectory: outputDirectory,
                    prettyPermalinks: prettyPermalinks
                });

                if (file.parser !== "copy") {
                    rd.renderString(file.contents.toString(), file.parser, context, file.filePath);
                } else {
                    // rd.copyFile(file.contents, file.filePath);
                }
            }
        })
    }
}