var assert = require("assert");

var indentation = require("../lib/indentation.js");
var parser = require("../lib/parser.js");
var evaluate = require("../lib/evaluate.js");

function omeletToHtml(input, context) {
    context = context || {};
    var ast = parser.parse(indentation.preprocess(input));
    var output = evaluate(ast, input, context, {
        directory: ".",
        file: "."
    });
    return output;
}

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

describe("Object and array definitions", function() {
    var context = {};

    var ex_simple_num = [
        {name: "positive integer",
            input: "+num: 47",
            output: ""},
        {name: "negative integer",
            input: "+num: -47",
            output: ""},
        {name: "positive float",
            input: "+num: 47.1223",
            output: ""},
        {name: "negative float",
            input: "+num: -47.1223",
            output: ""}
    ];
    ex_simple_num.forEach(function(example) {
        it("shouldn't output anything for number definitions: "+example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output);
        });
    });

    var ex_simple_str = [
        {name: "double-quoted string",
            input: "+name: \"reid mitchell\"",
            output: ""},
        {name: "single-quoted string",
            input: "+name: 'reid mitchell'",
            output: ""},
        {name: "empty string",
            input: "+name: ''",
            output: ""}
    ];
    ex_simple_str.forEach(function(example) {
        it("shouldn't output anything for string definitions: "+example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output);
        });
    });

    var ex_simple_bool = [
        {
            name: "boolean true",
            input: "+isOmeletCool: true",
            output: ""
        },
        {
            name: "boolean false",
            input: "+isOmeletUncool: false",
            output: ""
        }
    ];
    ex_simple_bool.forEach(function(example) {
        it("shouldn't output anything for boolean definitions: "+example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output);
        });
    });

    var ex_array = [
        {
            name: "array of numbers",
            input: "+arr:\n"+
                   "  - 47\n"+
                   "  - 100\n"+
                   "  - 28",
            output: ""
        },
        {
            name: "array of strings",
            input: "+arr:\n"+
                   "  - 'hello, world'\n"+
                   "  - 'this is Omelet!'\n"+
                   "  - 'lorem ipsum'",
            output: ""
        },
        {
            name: "array of booleans",
            input: "+arr:\n"+
                   "  - true\n"+
                   "  - true\n"+
                   "  - false",
            output: ""
        },
        {
            name: "array of arrays",
            input: "+arr:\n"+
                   "  -\n"+
                   "    - 1\n"+
                   "    - 2\n"+
                   "    - 3\n"+
                   "  -\n"+
                   "    - 'a'\n"+
                   "    - 'b'\n"+
                   "    - 'c'",
            output: ""
        },

        {
            name: "mixed array",
            input: "+arr:\n"+
                   "  - 47\n"+
                   "  - 'hello, world'\n"+
                   "  - false\n"+
                   "  -\n"+
                   "    - 1\n"+
                   "    - 'hello'",
            output: ""
        },
    ];
    ex_array.forEach(function(example) {
        it("shouldn't output anything for array definitions: "+example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output);
        });
    });

});

describe("Filters", function() {
    var context = {
        text: "Omelet",
        num: 47,
        fruits: ["apple","banana","orange"],
        person: {
            name: "Jane Doe",
            age: 22
        },
        people: [
            {name: "Alice", age: 22},
            {name: "Bob", age: 47},
            {name: "Carl", age: 3},
            {name: "Dani", age: 65}
        ],
        uh_oh: "<script>console.log('bad!');</script>",
        extra_spaces: "   hello      ",
        list_str: "hey,how,are,you,doing?"
    };

    var ex_applied = [
        {
            name: "{text|uppercase}",
            input: "{text|uppercase}",
            output: "OMELET"
        },
        {
            name: "{text|replace 'e' 'o'}",
            input: "{text|replace 'e' 'o'}",
            output: "Omolot"
        },
        {
            name: "{text|replace 'e' 'o'|uppercase}",
            input: "{text|replace 'e' 'o'|uppercase}",
            output: "OMOLOT"
        },
        {
            name: "{text|uppercase|replace 'e' 'o'}",
            input: "{text|uppercase|replace 'e' 'o'}",
            output: "OMELET"
        }
    ];
    ex_applied.forEach(function(example) {
        it('should apply to interpolations: '+example.name, function() {
            assert.equal(omeletToHtml(example.input, context), example.output);
        });
    });


    var ex_filters = [
        {
            name: "escape",
            input: "{uh_oh|escape}",
            output: "&lt;script&gt;console.log(&amp;apos;bad!&amp;apos;);&lt;/script&gt;"
        },
        {
            name: "uppercase",
            input: "{text|uppercase}",
            output: "OMELET"
        },
        {
            name: "uppercase (non-string)",
            input: "{num|uppercase}",
            output: "47"
        },
        {
            name: "lowercase",
            input: "{text|lowercase}",
            output: "omelet"
        },
        {
            name: "lowercase (non-string)",
            input: "{num|lowercase}",
            output: "47"
        },
        {
            name: "trim",
            input: "{extra_spaces|trim}",
            output: "hello"
        }
    ];
    ex_filters.forEach(function(example) {
        it('should apply correctly: '+example.name, function() {
            assert.equal(omeletToHtml(example.input, context), example.output);
        });
    });
});