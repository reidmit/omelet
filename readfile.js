var fs = require('fs');
var open = require('open');
var parser = require('./parser.js');
var evaluators = require('./evaluators.js');
var errors = require('./errors.js');
var beautify = require('js-beautify').html;
var __ = require('./util.js');

var flags = {
    prettyPrint: true,
    input: "other/test_input.omelet",
    output: "other/test_output.html"
}

fs.readFile(flags.input, function(err, contents) {
    if (err) throw err;

    var text = contents.toString();

    var input = text.split('\n').join(" ").replace(/\"/g,"\'");

    var ast = parser.parse(input);

    if (ast.status === false) return errors.ParseError(ast,input);

    __.printAST(ast);

    var output = evaluators.html(ast.value,input);

    if (flags.prettyPrint) {
        output = beautify(output, {indent_size: 4});
    }

    fs.writeFile(flags.output, output, function(err) {
        if (err) return console.log(err);
        //TODO: shouldn't say this if we had a SyntaxError
        console.log("File '"+flags.output+"' written successfully.");
    });

});