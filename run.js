var parse = require('./parser.js').parse;
var evaluate = require('./evaluate.js');
var renderer = require('./renderer.js');
var indentation = require('./indentation.js');
var r = new renderer.Renderer({
    prettyPrint: true,
    outputDirectory: "ignored/outputs"
});

var dir = "ignored/inputs";
var file = "basic.om";

var contents = r.readFileContents(dir+"/"+file);

contents = indentation.preprocess(contents);

var ast = parse(contents);

evaluate(ast, contents, {}, {
    directory: dir,
    file: file
});