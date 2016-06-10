var assert = require("assert");

var indentation = require("../lib/indentation.js")
var parser = require("../lib/parser.js");
var evaluate = require("../lib/evaluate.js");
// var util = require("../lib/util.js");

// describe('Utility functions', function() {
//     describe('#repeat()', function() {
//         it('should repeat single characters', function() {
//             assert.equal("aaaaa", util.repeat("a",5));
//         });
//         it('should repeat empty string', function() {
//             assert.equal("", util.repeat("",100));
//         });
//         it('should repeat longer strings', function() {
//             assert.equal("reidreidreidreid", util.repeat("reid",4));
//         });
//         it('should handle non-strings', function() {
//             assert.equal('4747474747', util.repeat(47,5));
//             assert.equal('[object Object][object Object]', util.repeat({},2));
//         })
//     });
// });


describe("Omelet string to HTML string", function() {
    var context = {};

    var ex_simple = [
        {name: "h1",
            input: "@h1 hello, world!",
            output: "<h1>hello, world!</h1>"},
        {name: "a",
            input: "@a[href=\"#\"] a link",
            output: "<a href=\"#\">a link</a>"},
    ];

    ex_simple.forEach(function(example) {
        it('translates simple tag: '+example.name, function() {
            var ast = parser.parse(indentation.preprocess(example.input));
            var output = evaluate(ast, example.input, context, {
                directory: ".",
                file: ".",
                sourceLanguage: "omelet",
                targetLanguage: "html"
            });
            assert.equal(output, example.output);
        });
    });

})