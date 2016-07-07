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
        }

    var examples = [
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
        {
            name: 'tags with boolean attributes',
            input: '@input[type=checkbox checked]',
            output: '<input type="checkbox" checked="checked"/>'
        },
        {
            name: 'multitags',
            input: '@b|i.classy|u testing',
            output: '<b><i class="classy"><u>testing</u></i></b>'
        },
        {
            name: 'nested block tags',
            input: '@div\n  @div\n    @h1 hello!\n  @div\n    @h2 hello!',
            output: '<div><div><h1>hello!</h1></div><div><h2>hello!</h2></div></div>'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'invalid characters in attributes',
            input: '@div[key=val <] something',
            error: /Lexer error/
        },
        {
            name: 'malformed special attributes',
            input: '@div.#idName',
            error: /Lexer error/
        },
        {
            name: 'missing attribute value',
            input: '@div[key=] ok',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('Filters', function() {
    var context = {
            word: 'omelet',
            sentence: 'Omelet is cool!',
            padded: '     lots of spaces        ',
            number: 47,
            listOfNumbers: [4, 8, 15, 16, 23, 42],
            listUnsorted: [42, 8, 16, 4, 23, 15],
            listOfMixed: [true, 47, 'hello', 23, 42, 23],
            listShort: ['lol'],
            listOfObjects: [
                {
                    name: 'book',
                    price: 20,
                    date: new Date('12/23/1993')
                },
                {
                    name: 'sandwich',
                    price: 7,
                    date: new Date('5/15/2016')
                },
                {
                    name: 'coffee',
                    price: 2,
                    date: new Date('10/20/2014')
                }
            ],
            listOfLists: [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ],
            object: {
                price: 20,
                name: 'book',
                date: new Date('12/23/1993')
            },
            cat: {
                age: 7
            },
            date1: new Date('12/23/1993'),
            date2: new Date('5/15/2016'),
            dateString: '12/23/1993',
            htmlString: '<h1 id="anchor">hello, world!</h1>',
            unsafeString1: '<script>console.log("gotcha");</script>',
            unsafeString2: 'x & y',
            emptyString: '',
            nullValue: null,
            undefinedValue: undefined
        },
        options = {
            prettyPrint: false
        }
    var examples = [
        {
            name: 'eq',
            input: '{word | eq "omelet"}, {word | eq 47}, {number | eq 47}, {object | eq object}, {object | eq listOfObjects[0]}, {listOfMixed | eq listShort}, {listOfMixed | eq listOfNumbers}, {listOfNumbers | eq listOfNumbers}, {object | eq cat}, {listOfObjects[0] | eq listOfObjects[1]}, {date1 | eq date2}',
            output: 'true, false, true, true, true, false, false, true, false, false, false'
        },
        {
            name: 'neq',
            input: '{word | neq "omelet"}, {word | neq 47}, {number | neq 47}, {object | neq object}, {object | neq listOfObjects[0]}, {listOfMixed | neq listShort}, {listOfMixed | neq listOfNumbers}, {listOfNumbers | neq listOfNumbers}, {object | neq cat}, {listOfObjects[0] | neq listOfObjects[1]}, {date1 | neq date2}',
            output: 'false, true, false, false, false, true, true, false, true, true, true'
        },
        {
            name: 'gt',
            input: '{number | gt 40}, {date2 | gt date1}',
            output: 'true, true'
        },
        {
            name: 'lt',
            input: '{number | lt 40}, {date2 | lt date1}',
            output: 'false, false'
        },
        {
            name: 'gte',
            input: '{number | gte 40}, {date2 | gte date1}, {number | gte 47}, {date1 | gte date1}',
            output: 'true, true, true, true'
        },
        {
            name: 'lte',
            input: '{number | lt 40}, {date2 | lt date1}, {number | lte 47}, {date1 | lte date1}',
            output: 'false, false, true, true'
        },
        {
            name: 'even',
            input: '{number | even}, {word | even}, {object.price | even}',
            output: 'false, false, true'
        },
        {
            name: 'odd',
            input: '{number | odd}, {word | odd}, {object.price | odd}',
            output: 'true, false, false'
        },
        {
            name: 'starts_with',
            input: '{word | starts_with "om"}, {listOfNumbers | starts_with 4}, {number | starts_with 4}',
            output: 'true, true, false'
        },
        {
            name: 'ends_with',
            input: '{sentence | ends_with "!"}, {listOfMixed | ends_with 23}, {number | ends_with 7}',
            output: 'true, true, false'
        },
        {
            name: 'contains',
            input: '{sentence | contains "cool"}, {sentence | contains "omelet"}, {listOfMixed | contains true}, {number | contains "x"}',
            output: 'true, false, true, false'
        },
        {
            name: 'uppercase',
            input: '{word | uppercase}, {number | uppercase}',
            output: 'OMELET, 47'
        },
        {
            name: 'lowercase',
            input: '{sentence | lowercase}, {number | lowercase}',
            output: 'omelet is cool!, 47'
        },
        {
            name: 'trim',
            input: '{padded | trim}, {number | trim}',
            output: 'lots of spaces, 47'
        },
        {
            name: 'ltrim',
            input: '{padded | ltrim}, {number | ltrim}',
            output: 'lots of spaces        , 47'
        },
        {
            name: 'rtrim',
            input: '{padded | rtrim}, {number | rtrim}',
            output: '     lots of spaces, 47'
        },
        {
            name: 'replace',
            input: '{word | replace "e" "o"}, {number | replace "4" ""}',
            output: 'omolot, 7'
        },
        {
            name: 'replace_first',
            input: '{word | replace_first "e" "o"}, {number | replace_first "4" ""}',
            output: 'omolet, 7'
        },
        {
            name: 'truncate',
            input: '{sentence | truncate 0}, {sentence | truncate 10}, {sentence | truncate 100}, {number | truncate 10}',
            output: '..., Omelet is ..., Omelet is cool!, 47'
        },
        {
            name: 'truncate_words',
            input: '{sentence | truncate_words 0}, {sentence | truncate_words 2}, {sentence | truncate_words 10}, {number | truncate_words 10}',
            output: '..., Omelet is..., Omelet is cool!, 47'
        },
        {
            name: 'join',
            input: '{listOfNumbers | join "--"}, {listShort | join ", "}, {number | join "--"}',
            output: '4--8--15--16--23--42, lol, 47'
        },
        {
            name: 'append',
            input: '{word | append " is fun"}, {number | append "yeah"}',
            output: 'omelet is fun, 47yeah'
        },
        {
            name: 'prepend',
            input: '{word | prepend "i like "}, {number | prepend "yeah"}',
            output: 'i like omelet, yeah47'
        },
        {
            name: 'strip_tags',
            input: '{htmlString | strip_tags}',
            output: 'hello, world!'
        },
        {
            name: 'escape',
            input: '{unsafeString1 | escape}, {unsafeString2 | escape}',
            output: '&amp;lt;script&amp;gt;console.log(&quot;gotcha&quot;);&amp;lt;/script&amp;gt;, x &amp;amp; y'
        },
        {
            name: 'length / size',
            input: '{word | length}, {word | size}, {listOfNumbers | length}, {listOfNumbers | size}, {object | length}, {object | size}, {number | size}',
            output: '6, 6, 6, 6, 3, 3, 1'
        },
        {
            name: 'word_count',
            input: '{word | word_count}, {sentence | word_count}, {number | word_count}',
            output: '1, 3, 1'
        },
        {
            name: 'split',
            input: '[{word | split "e"}], [{sentence | split " "}], {number | split "x"}',
            output: '[om,l,t], [Omelet,is,cool!], 47'
        },
        {
            name: 'keys',
            input: '[{object | keys}], [{listOfNumbers | keys}], {number | keys}',
            output: '[price,name,date], [0,1,2,3,4,5], 47'
        },
        {
            name: 'sort',
            input: '[{listUnsorted | sort}], {number | sort}',
            output: '[4,8,15,16,23,42], 47'
        },
        {
            name: 'sort_by',
            input: '[{listOfObjects | sort_by "price" | map (get "name")}], [{listOfObjects | sort_by "date" | map (get "name")}], [{listOfObjects | sort_by "name" | map (get "name")}], {number | sort_by "prop"}',
            output: '[coffee,sandwich,book], [book,coffee,sandwich], [book,coffee,sandwich], 47'
        },
        {
            name: 'reverse',
            input: '[{listOfNumbers | reverse}], {word | reverse}, {number | reverse}',
            output: '[42,23,16,15,8,4], telemo, 47'
        },
        {
            name: 'to_date',
            input: '{dateString | to_date | type_of}',
            output: 'Date'
        },
        {
            name: 'default',
            input: '{emptyString | default "empty!"}, {word | default "empty!"}, {nullValue | default "null!"}, {undefinedValue | default "undefined!"}, {number | default 1}',
            output: 'empty!, omelet, null!, undefined!, 47'
        },
        {
            name: 'nth',
            input: '{listOfNumbers | nth 4}, {listOfNumbers | nth 100}, {word | nth 0}, {number | nth 7}, {word | nth 1000}',
            output: '23, , o, , '
        },
        {
            name: 'get',
            input: '{object | get "price"}, {listOfObjects[1] | get "name"}, {listOfObjects[1] | get "something undefined"}, {number | get "prop"}',
            output: '20, sandwich, , '
        },
        {
            name: 'type_of',
            input: '{object | type_of}, {number | type_of}, {word | type_of}, {listOfNumbers | type_of}, {date1 | type_of}',
            output: 'Dictionary, Number, String, List, Date'
        },
        {
            name: 'map',
            input: '[{listOfNumbers | map (gt 20)}], {number | map (gt 20)}, [{listOfObjects | map (get "name" | uppercase)}], {listOfLists | map (map (even) | join "," | append "]" | prepend "[") | join "," | append "]" | prepend "["}',
            output: '[false,false,false,false,true,true], true, [BOOK,SANDWICH,COFFEE], [[false,true,false],[true,false,true],[false,true,false]]'
        },
        {
            name: 'for_each',
            input: '[{listOfNumbers | for_each (gt 20)}], {number | for_each (gt 20)}, [{listOfObjects | for_each (get "name" | uppercase)}], {listOfLists | for_each (for_each (even) | join "," | append "]" | prepend "[") | join "," | append "]" | prepend "["}',
            output: '[false,false,false,false,true,true], true, [BOOK,SANDWICH,COFFEE], [[false,true,false],[true,false,true],[false,true,false]]'
        },
        {
            name: 'filter',
            input: '[{listOfNumbers | filter (gt 20)}], {number | filter (lt 20)}, [{listOfObjects | filter (get "name" | eq "coffee") | nth 0 | get "price"}]',
            output: '[23,42], , [2]'
        },
        {
            name: 'keep_if',
            input: '[{listOfNumbers | keep_if (gt 20)}], {number | keep_if (lt 20)}, [{listOfObjects | keep_if (get "name" | eq "coffee") | nth 0 | get "price"}]',
            output: '[23,42], , [2]'
        }
    ]

    examples.forEach(function(example) {
        it('correctly applies filter ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing filter name after |',
            input: '{word |}',
            error: /Lexer error/
        },
        {
            name: 'missing closing paren around filter sequence',
            input: '{listOfNumbers | map (gt 10}',
            error: /Lexer error/
        },
        {
            name: 'to_date can\'t convert input to a Date',
            input: '{word | to_date}',
            error: /Filter error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input, context, options)
            }, example.err)
        })
    })
})

describe('Doctypes', function() {
    var context = {},
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'html',
            input: '@doctype html',
            output: '<!doctype html>'
        },
        {
            name: 'html5',
            input: '@doctype html5',
            output: '<!doctype html>'
        },
        {
            name: '5',
            input: '@doctype 5',
            output: '<!doctype html>'
        },
        {
            name: '4.01',
            input: '@doctype 4.01',
            output: '<!DOCTYPE HTML PUBLIC \'-//W3C//DTD HTML 4.01 Transitional //EN\' \'http://www.w3.org/TR/html4/loose.dtd\'>'
        },
        {
            name: 'transitional',
            input: '@doctype 4.01',
            output: '<!DOCTYPE HTML PUBLIC \'-//W3C//DTD HTML 4.01 Transitional //EN\' \'http://www.w3.org/TR/html4/loose.dtd\'>'
        },
        {
            name: 'frameset',
            input: '@doctype frameset',
            output: '<!DOCTYPE HTML PUBLIC \'-//W3C//DTD HTML 4.01 Frameset //EN\' \'http://www.w3.org/TR/html4/frameset.dtd\'>'
        },
        {
            name: 'xhtml_1.0',
            input: '@doctype xhtml_1.0',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Strict //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\'>'
        },
        {
            name: 'xhtml_1.0_strict',
            input: '@doctype xhtml_1.0_strict',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Strict //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\'>'
        },
        {
            name: 'xhtml_strict',
            input: '@doctype xhtml_strict',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Strict //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\'>'
        },
        {
            name: 'xhtml_1.0_transitional',
            input: '@doctype xhtml_1.0_transitional',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Transitional //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\'>'
        },
        {
            name: 'xhtml_transitional',
            input: '@doctype xhtml_transitional',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Transitional //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\'>'
        },
        {
            name: 'xhtml_1.0_frameset',
            input: '@doctype xhtml_1.0_frameset',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Frameset //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\'>'
        },
        {
            name: 'xhtml_frameset',
            input: '@doctype xhtml_frameset',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.0 Frameset //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\'>'
        },
        {
            name: 'xhtml_1.1',
            input: '@doctype xhtml_1.1',
            output: '<!DOCTYPE html PUBLIC \'-//W3C//DTD XHTML 1.1//EN\' \'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\'>'
        },
        {
            name: 'something_else',
            input: '@doctype something_else',
            output: '<!doctype something_else>'
        },
        {
            name: 'an empty (invalid) doctype',
            input: '@doctype ',
            output: '<doctype></doctype>'
        },
        {
            name: 'a tag called @doctype',
            input: '@doctype',
            output: '<doctype></doctype>'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })
})

describe('Comments', function() {
    var context = {},
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'full-line comment',
            input: '## this is a full-line comment\n',
            output: ''
        },
        {
            name: 'partial-line comment',
            input: 'something ## this is a partial-line comment\n',
            output: 'something '
        },
        {
            name: 'escaped non-comment',
            input: '#\\# this is not a comment',
            output: '## this is not a comment'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })
})

describe('Interpolations', function() {
    var context = {
            word: 'omelet',
            unsafe: '<script>&\'\"</script>',
            number: 47
        },
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'simple interpolation',
            input: '{word}',
            output: 'omelet'
        },
        {
            name: 'auto-escaped interpolation',
            input: '{unsafe}',
            output: '&lt;script&gt;&amp;&apos;&quot;&lt;/script&gt;'
        },
        {
            name: 'non-escaped interpolation',
            input: '{~unsafe}',
            output: '<script>&\'\"</script>'
        },
        {
            name: 'tag interpolation',
            input: 'hello {@b world}!',
            output: 'hello <b>world</b>!'
        },
        {
            name: 'tag interpolation across lines',
            input: 'this is some text {@b that spans\nacross lines}!',
            output: 'this is some text <b>that spans\nacross lines</b>!'
        },
        {
            name: 'escaped non-interpolation',
            input: 'this is \\{not an interpolation}',
            output: 'this is {not an interpolation}'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'no variable name in interpolation',
            input: 'bad: {}',
            error: /Lexer error/
        },
        {
            name: 'missing closing brace',
            input: 'bad: {word',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('If statements', function() {
    var context = {
            valueT: true,
            valueF: false,
            valueF2: false,
            word: 'omelet',
            empty: '',
            nullValue: null,
            list: [1, 2, 3, 4, 5]
        },
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'just if (true)',
            input: '>if valueT\n  this',
            output: 'this'
        },
        {
            name: 'just if (false)',
            input: '>if valueF\n  this',
            output: ''
        },
        {
            name: 'if with negated predicate',
            input: '>if not valueF\n  this',
            output: 'this'
        },
        {
            name: 'if/else (true)',
            input: '>if valueT\n  this\n>else\n  that',
            output: 'this'
        },
        {
            name: 'if/else (false)',
            input: '>if valueF\n  this\n>else\n  that',
            output: 'that'
        },
        {
            name: 'elifs',
            input: '>if valueF\n  one\n>elif valueF2\n  two\n>elif valueT\n  three',
            output: 'three'
        },
        {
            name: 'elif with negated predicate',
            input: '>if valueF\n  one\n>elif not valueF2\n  two',
            output: 'two'
        },
        {
            name: 'filters on if predicate',
            input: '>if word | length | gt 3\n  this\n>else\n  that',
            output: 'this'
        },
        {
            name: 'higher-order filters on if predicate',
            input: '>if list | filter (gt 3) | length | gt 0\n  this\n>else\n  that',
            output: 'this'
        },
        {
            name: 'filters on elif predicate',
            input: '>if valueF\n  one\n>elif word | length | gt 3\n  two\n>else\n  three',
            output: 'two'
        },
        {
            name: 'falsy predicate (null)',
            input: '>if nullValue\n  this\n',
            output: ''
        },
        {
            name: 'falsy predicate (empty string)',
            input: '>if empty\n  this\n',
            output: ''
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing predicate after >if',
            input: '>if \n  ok',
            error: /Lexer error/
        },
        {
            name: 'missing predicate after >elif',
            input: '>if valueF\n  this\n>elif \n  that',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('Indents & newlines', function() {
    var context = {},
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'indented, nested tags',
            input: '@div hello\n@ul\n  @li|a[href=#] item\n  @li|a[href=#] item\n  @li|a[href=#]\n    @h1 headline',
            output: '<div>hello</div><ul><li><a href="#">item</a></li><li><a href="#">item</a></li><li><a href="#"><h1>headline</h1></a></li></ul>'
        },
        {
            name: '\\r\\n linebreaks',
            input: '@div\r\n  @div hello, world',
            output: '<div><div>hello, world</div></div>'
        },
        {
            name: 'consecutive blank lines',
            input: 'hello\n\n\n  \n  \n \n   \nworld',
            output: 'hello\nworld'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'first line of input is indented',
            input: '   hello!',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('Definitions', function() {
    var context = {
            word: 'omelet'
        },
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'number definition (positive integer)',
            input: '+ number = 47\n{number}, {number | type_of}',
            output: '47, Number'
        },
        {
            name: 'number definition (negative integer)',
            input: '+ number = -47\n{number}, {number | type_of}',
            output: '-47, Number'
        },
        {
            name: 'number definition (positive float)',
            input: '+ number = 47.1223\n{number}, {number | type_of}',
            output: '47.1223, Number'
        },
        {
            name: 'number definition (negative float)',
            input: '+ number = -47.1223\n{number}, {number | type_of}',
            output: '-47.1223, Number'
        },
        {
            name: 'invalid number definition',
            input: '+ notNumber = 47 is a good number\n{notNumber}',
            output: '47 is a good number'
        },
        {
            name: 'boolean definitions',
            input: '+ one = true\n+ two = false\n{one}, {one | type_of}\n{two}, {two | type_of}',
            output: 'true, Boolean\nfalse, Boolean'
        },
        {
            name: 'invalid boolean definitions (actually strings)',
            input: '+ three = True\n+ four = False\n+ five = true !\n+ six = false it is\n+ seven = "false"\n{three}, {three | type_of}\n{four}, {four | type_of}\n{five}, {five | type_of}\n{six}, {six | type_of}\n{seven}, {seven | type_of}',
            output: 'True, String\nFalse, String\ntrue !, String\nfalse it is, String\nfalse, String'
        },
        {
            name: 'quoted string definitions (single-quotes)',
            input: '+ str = "hello..."\n{str}\n+ str2 = "it\'s me"\n{str2}',
            output: 'hello...\nit&apos;s me'
        },
        {
            name: 'quoted string definitions (double-quotes)',
            input: '+ str = \'hello...\'\n{str}\n+ str2 = \'"it is me"\'\n{str2}',
            output: 'hello...\n&quot;it is me&quot;'
        },
        {
            name: 'unquoted line of text containing quotes',
            input: '+ line = She sang, "Hello, it\'s me." It was great.\n{line}',
            output: 'She sang, &quot;Hello, it&apos;s me.&quot; It was great.'
        },
        {
            name: 'unquoted line of text beginning with a quote',
            input: '+ line = "Hello, it\'s me," she sang.\n{line}',
            output: '&quot;Hello, it&apos;s me,&quot; she sang.'
        },
        {
            name: 'list of simple values',
            input: '+ list =\n  - 47\n  - true\n  \n  - "quoted"\n  - hello, world!\n\n{list[0]}, {list[0] | type_of}\n{list[1]}, {list[1] | type_of}\n{list[2]}, {list[2] | type_of}\n{list[3]}, {list[3] | type_of}',
            output: '47, Number\ntrue, Boolean\nquoted, String\nhello, world!, String'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing identifier after +',
            input: '+ 47 = thing',
            error: /Lexer error/
        },
        {
            name: 'missing =',
            input: '+ thing\nok',
            error: /Lexer error/
        },
        {
            name: 'newline in quoted string',
            input: '+ str = "hello...\nit\'s me"',
            error: /Lexer error/
        },
        {
            name: 'missing end quote for quoted string',
            input: '+ str = "hello... it\'s me',
            error: /Lexer error/
        },
        {
            name: 'empty definition',
            input: '+ thing =\nok',
            error: /Parser error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('Modifiers', function() {
    var context = {
            object: {
                name: 'omelet',
                list: [4, 8, 15, 16, 23, 42],
                person: {
                    name: 'reid',
                    age: 22
                },
                3: 'indexed by number'
            }
        },
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'object property access with .key',
            input: '{object.name}',
            output: 'omelet'
        },
        {
            name: 'object property access with ["key"]',
            input: '{object["name"]}',
            output: 'omelet'
        },
        {
            name: 'object property access with [number]',
            input: '{object[3]}',
            output: 'indexed by number'
        },
        {
            name: 'combination of modifiers',
            input: '{object.person["name"]}',
            output: 'reid'
        },
        {
            name: 'array element access with [index]',
            input: '{object.list[2]}',
            output: '15'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing identifier after .',
            input: '{object.}',
            error: /Lexer error/
        },
        {
            name: 'invalid modifier',
            input: '{object[&]}',
            error: /Lexer error/
        },
        {
            name: 'missing closing bracket ]',
            input: '{object[name}',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('For loops', function() {
    var context = {
            items: [
                {
                    name: 'book',
                    price: 15
                },
                {
                    name: 'sandwich',
                    price: 7
                },
                {
                    name: 'coffee',
                    price: 3
                }
            ],
            list: [4, 8, 15, 16, 23, 42],
            emptyList: []
        },
        options = {
            prettyPrint: false
        }

    var examples = [
        {
            name: 'loop over array of objects',
            input: '>for item in items\n  the {item.name} costs ${item.price}\n\nonce',
            output: 'the book costs $15\nthe sandwich costs $7\nthe coffee costs $3\nonce'
        },
        {
            name: 'loop over array of numbers with filters',
            input: '>for num in list | filter (gt 20)\n  greater than 20: {num}',
            output: 'greater than 20: 23\ngreater than 20: 42\n'
        },
        {
            name: 'loop over empty array',
            input: '>for element in emptyList\n  this will never print',
            output: ''
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing identifier after >for',
            input: '>for \n',
            error: /Lexer error/
        },
        {
            name: 'missing \'in\' after identifier',
            input: '>for item\n',
            error: /Lexer error/
        },
        {
            name: 'missing identifier after \'in\'',
            input: '>for item in \n',
            error: /Lexer error/
        },
        {
            name: 'missing loop body',
            input: '>for num in list\n  \nhello',
            error: /Parser error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})

describe('Modes', function() {
    var context = {},
        options = {
            modes: {
                uppercase: function(input) {
                    return input.toUpperCase()
                },
                bad: 'hello!'
            },
            prettyPrint: false
        }

    var examples = [
        {
            name: 'default mode (raw text)',
            input: ':modeName\n  this is raw text in a default mode{\n  and {}it will be rendered\n  >exactly as it { was written}',
            output: '\nthis is raw text in a default mode{\nand {}it will be rendered\n>exactly as it { was written}\n'
        },
        {
            name: 'custom mode',
            input: ':uppercase\n  this is raw text that will\n  be converted to uppercase\n  by the "uppercase" mode',
            output: '\nTHIS IS RAW TEXT THAT WILL\nBE CONVERTED TO UPPERCASE\nBY THE "UPPERCASE" MODE\n'
        },
        {
            name: 'invalid mode (not a function)',
            input: ':bad\n  this text will not be changed',
            output: '\nthis text will not be changed\n'
        },
        {
            name: 'text beginning with : (not a mode)',
            input: ': this is something else',
            output: ': this is something else'
        },
        {
            name: 'text beginning with :letters (not a mode)',
            input: ':this looks like a mode at first, but is not',
            output: ':this looks like a mode at first, but is not'
        },
        {
            name: 'extra spaces after mode name',
            input: ':uppercase   \n  this is raw text',
            output: '\nTHIS IS RAW TEXT\n'
        },
        {
            name: 'text following mode',
            input: ':uppercase\n  this is\n  raw text\nand this is regular text',
            output: '\nTHIS IS\nRAW TEXT\nand this is regular text'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })
})

describe('Imports', function() {
    var context = {},
        options = {
            filePath: __dirname + '/test',
            prettyPrint: false
        }

    var examples = [
        {
            name: 'file import',
            input: '>import testMacros as tm\n{tm.word}',
            output: 'omelet'
        },
        {
            name: 'file import with explicit file extension',
            input: '>import testMacros.om as tm\n{tm.word}',
            output: 'omelet'
        },
        {
            name: 'directory import',
            input: '>import-dir testPosts as posts\n>for post in posts\n  title: {post.title}',
            output: 'title: the first post\ntitle: the second post\ntitle: the third post\n'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input, context, options), example.output)
        })
    })

    var bad_examples = [
        {
            name: 'missing path after \'>import\'',
            input: '>import \n',
            error: /Lexer error/
        },
        {
            name: 'missing \'as\' after path',
            input: '>import testMacros\n',
            error: /Lexer error/
        },
        {
            name: 'missing alias after \'as\'',
            input: '>import testMacros as \n',
            error: /Lexer error/
        },
        {
            name: 'missing path after \'>import-dir\'',
            input: '>import-dir \n',
            error: /Lexer error/
        },
        {
            name: 'missing \'as\' after path in import-dir',
            input: '>import-dir testPosts\n',
            error: /Lexer error/
        },
        {
            name: 'missing alias after \'as\' in import-dir',
            input: '>import-dir testPosts as \n',
            error: /Lexer error/
        }
    ]

    bad_examples.forEach(function(example) {
        it('fails when ' + example.name, function() {
            assert.throws(function() {
                omeletToHtml(example.input)
            }, example.error)
        })
    })
})