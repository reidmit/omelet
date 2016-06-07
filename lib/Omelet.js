var renderer = require("./renderer.js");

module.exports = function(options) {
    var cache = options.cacheDirectory || false;
    var outputDirectory = options.outputDirectory;
    var context = options.context || {};
    var permalinks = options.permalinks;

    this.render = function(fileInfoList) {

        for (var i=0; i<fileInfoList.length; i++) {
            context[fileInfoList[i].filePath] = fileInfoList[i];
        }

        fileInfoList.forEach(function(file) {
            if (!file.isHidden) {
                var rd = new renderer.Renderer({
                    sourceLanguage: file.parser,
                    outputDirectory: outputDirectory,
                    permalinks: permalinks
                });

                if (file.parser !== "copy") {
                    rd.renderString(file.contents.toString(), file.parser, context, file.filePath);
                } else {
                    rd.copyBytes(file.contents, file.filePath);
                }
            }

        })

    }
}