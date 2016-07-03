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
        {
            name: 'multitags',
            input: '@b|i.classy|u testing',
            output: '<b><i class="classy"><u>testing</u></i></b>'
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output)
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
            assert.equal(omeletToHtml(example.input, context), example.output)
        })
    })
})

describe('Doctypes', function() {
    var context = {},
        options = {
            prettyPrint: false
        },
        examples

    examples = [
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
        }
    ]

    examples.forEach(function(example) {
        it('translates ' + example.name, function() {
            assert.equal(omeletToHtml(example.input), example.output)
        })
    })
})