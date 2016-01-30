var fs = require('fs');
var open = require('open');
var parser = require('./parser.js');
var evaluators = require('./evaluators.js');
// var errors = require('./errors.js');
var beautify = require('js-beautify').html;
var __ = require('./util.js');

var flags = {
    prettyPrint: true,
    input: "other/test_input.omelet",
    output: "other/test_output.html"
}

var context = {
    items: [
        {name: "car", price: 20000},
        {name: "book", price: 20},
        {name: "airplane", price: 50000},
        {name: "scooter", price: 50},
        {name: "sandwich", price: 7}
    ],
    car: {
        color: "red",
        year: 1993
    },
    people: [
        "reid",
        "caroline",
        "scottie",
        "luke",
        "angela"
    ]
}

fs.readFile(flags.input, function(err, contents) {
    if (err) throw err;

    var text = contents.toString();

    var input = text.split('\n').join(" ").replace(/\"/g,"\'");
    // var input = text;

    var ast = parser.omelet().parse(input);

    if (ast.status === false) throw ParseError(ast,input);

    __.printAST(ast);

    //wrap context items so that they have a kind, and can be evaluated.
    // for (var key in context) {
    //    if (context.hasOwnProperty(key)) {
    //       context[key] = {value: context[key], kind: "Raw"};
    //    }
    // }


    var output = evaluators.html(ast.value, input, context);

    if (flags.prettyPrint) {
        output = beautify(output, {indent_size: 4, indent_inner_html: true, extra_liners: []});
    }

    fs.writeFile(flags.output, output, function(err) {
        if (err) return console.log(err);
        //TODO: shouldn't say this if we had a SyntaxError
        console.log("File '"+flags.output+"' written successfully.");
        console.log("----------------");
        console.log(output);
    });

});