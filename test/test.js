var assert = require('assert')

var lexer = require('../lib/lexer.js')
var parser = require('../lib/parser.js')
var linker = require('../lib/linker.js')
var compiler = require('../lib/compiler.js')

function omeletToHtml(input, context, options) {
    context = context || {}
    options = options || {}
    var tokens = lexer.lex(input, options),
        ast = parser.parse(tokens, options),
        linkedAst = linker.link(ast, options),
        template = compiler.compile(linkedAst, options)
    return template(context)
}

describe('Tags', function() {
    var context = {},
        options = {
            prettyPrint: false
        },
        examples

    examples = [
        {
            name: 'plain tag',
            input: '@h1 hello, world!',
            output: '<h1>hello, world!</h1>'
        },
        {
            name: 'several tags',
            input: '@h1 hello, world!\n@h2 hi!\n@h3 this is omelet',
            output: '<h1>hello, world!</h1><h2>hi!</h2><h3>this is omelet</h3>'
        },
        {
            name: 'tags with attributes',
            input: '@a#anchor.className[href="#" target="_blank"] click me',
            output: '<a class="className" id="anchor" href="#" target="_blank">click me</a>'
        },
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output)
        })
    })

})

// describe("Omelet tags to HTML tags", function() {
//     var context = {};

//     var ex_lineTag = [
//         {name: "h1",
//             input: "@h1 hello, world!",
//             output: "<h1>hello, world!</h1>"},
//         {name: "a",
//             input: "@a[href=\"#\" target=\"_blank\"] a link",
//             output: "<a href=\"#\" target=\"_blank\">a link</a>"},
//         {name: "b|i|u",
//             input: "@b|i|u some text",
//             output: "<b><i><u>some text</u></i></b>"},
//         {name: "b.className|i",
//             input: "@b.className|i some text",
//             output: "<b class=\"className\"><i>some text</i></b>"},
//     ];

//     ex_lineTag.forEach(function(example) {
//         it('translates line tag: '+example.name, function() {
//             assert.equal(omeletToHtml(example.input), example.output);
//         });
//     });

//     var ex_interpolatedTag = [
//         {name: "{@b}",
//             input: "this one has {@b bold text}.",
//             output: "this one has <b>bold text</b>."},
//         {name: "@h1 {@b}",
//             input: "@h1 this title has {@b bold text}.",
//             output: "<h1>this title has <b>bold text</b>.</h1>"},
//         {name: "{@b|i}",
//             input: "this has {@b|i interpolated multitags}!",
//             output: "this has <b><i>interpolated multitags</i></b>!"}
//     ];

//     ex_interpolatedTag.forEach(function(example) {
//         it('translates interpolated tag: '+example.name, function() {
//             assert.equal(omeletToHtml(example.input), example.output);
//         });
//     });
// });

//these tests pass, but they aren't parsed as numbers, just as strings
// describe("Omelet literals to HTML", function() {
//     var context = {};

//     var ex_numbers_ok = [
//         {name: "positive integer",
//             input: "47",
//             output: "47"},
//         {name: "negative integer",
//             input: "-47",
//             output: "-47"},
//         {name: "positive decimal",
//             input: "47.4747",
//             output: "47.4747"},
//         {name: "negative decimal",
//             input: "-47.4747",
//             output: "-47.4747"}
//     ];
//     ex_numbers_ok.forEach(function(example) {
//         it('translates number: '+example.name, function() {
//             assert.equal(omeletToHtml(example.input), example.output);
//         });
//     });
// });