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
            number: 47,
            listOfNumbers: [4, 8, 15, 16, 23, 42],
            listOfMixed: [true, 47, 'hello', 23, 42, 0],
            listShort: ['lol'],
            listOfObjects: [
                {
                    name: 'book',
                    price: 20
                },
                {
                    name: 'sandwich',
                    price: 7
                },
                {
                    name: 'soda',
                    price: 2
                }
            ],
            object: {
                price: 20,
                name: 'book'
            }
        },
        options = {
            prettyPrint: false
        }
    var examples = [
        {
            name: 'eq',
            input: '{word | eq "omelet"}, {word | eq 47}, {number | eq 47}, {object | eq object}, {object | eq listOfObjects[0]}, {listOfMixed | eq listShort}, {listOfMixed | eq listOfNumbers}',
            output: 'true, false, true, true, true, false, false'
        },
        {
            name: 'neq',
            input: '{word | neq "omelet"}, {word | neq 47}, {number | neq 47}, {object | neq object}, {object | neq listOfObjects[0]}, {listOfMixed | neq listShort}, {listOfMixed | neq listOfNumbers}',
            output: 'false, true, false, false, false, true, true'
        },
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