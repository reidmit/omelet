var Splitter = require('./split.js');

module.exports = function(options) {
    var cache = options.cacheDirectory || false;
    var outputDirectory = options.outputDirectory;
    var context = options.context || {};

    var splitter = new Splitter(outputDirectory, cache);

    this.render = function(inputFile) {
        if (typeof inputFile === 'undefined')
            throw Error("Input file (inputFile option) must be defined");
        splitter.splitAndRender(inputFile, context);
    }
}