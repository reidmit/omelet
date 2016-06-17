/*
-----------------------------------------------------------------------------
OMELET COMPILER

Transforms an Omelet parse tree into a JavaScript function that takes in a
context object and returns a string.
-----------------------------------------------------------------------------
*/
var __ = require('./util.js')
var runtime = require('./runtime.js')

var elements = {
    void: {'area':1,'base':1,'br':1,'col':1,'embed':1,'hr':1,'img':1,'input':1,'keygen':1,'link':1,'meta':1,'param':1,'source':1,'track':1,'wbr':1},
    raw: {'script':1,'style':1},
    escapableRaw: {'textarea':1,'title':1}
}
var higherOrderFilters = {'map':1,'filter':1,'keep_if':1,'for_each':1}

function Compiler(ast) {
    var self = this

    this.ast = ast
    this.buffer = []

    this.filtersUsed = {}
    this.filtersUsedCount = 0

    this.ctx = 'context'
    this.out = 'out'
    this.fltrs = 'omelet$filters'
    this.applyFn = 'runtime.applyFilters'
}

Compiler.prototype.write = function(str) {
    this.buffer.push(str)
}

Compiler.prototype.pauseStr = function() {
    this.write('"+')
}

Compiler.prototype.resumeStr = function() {
    this.write('+"')
}

Compiler.prototype.visitEach = function(nodes) {
    for (var i = 0; i < nodes.length; i++) {
        this.visit(nodes[i])
    }
}

Compiler.prototype.visit = function(node) {
    switch (node.kind) {
        case 'Array':
            this.write('[')
            for (var i = 0; i < node.elements.length; i++) {
                if (i !== 0) {
                    this.write(',')
                }
                this.visit(node.elements[i])
            }
            this.write(']')
            break
        case 'ArrayElement':
            this.visit(node.value)
            break
        case 'Attribute':
            this.write(' ')
            this.visit(node.name)
            this.write('=\'')
            this.visit(node.value)
            this.write('\'')
            break
        case 'Block':
            this.visitEach(node.contents)
            break
        case 'Boolean':
            this.write(node.value)
            break
        case 'Comment':
            break
        case 'Definition':
            this.write('";')
            this.write(this.ctx+'.'+node.name.value+'=')
            if (node.parameters.length === 0) {
                var kind = node.body.kind
                if (kind === 'String' || kind === 'Block') {
                    this.write('"')
                    this.visit(node.body)
                    this.write('"')
                } else {
                    this.visit(node.body)
                }
            } else {
            }
            this.write(';'+this.out+'+="')
            break
        case 'Dictionary':
            this.write('{')
            for (var i = 0; i < node.entries.length; i++) {
                this.write('"' + node.entries[i].name.value + '":')
                this.visit(node.entries[i].body)
                if (i !== node.entries.length - 1) {
                    this.write(',')
                }
            }
            this.write('}')
            break
        case 'Doctype':
            this.write(__.doctype(node.name.value))
            break
        case 'Extend':
            throw Error('Extends should have been resolved already.')
            break
        case 'Filter':
            if (runtime.filters[node.name.value] === undefined) {
                throw Error('Cannot apply unrecognized filter \'' + filterName + '\'.')
            }

            this.filtersUsedCount++
            this.filtersUsed[node.name.value] = true
            this.write('[')
            this.write('"' + node.name.value + '",[')
            for (var i = 0; i < node.arguments.length; i++) {
                if (node.arguments[i].kind === 'String') {
                    this.write('"')
                    this.visit(node.arguments[i])
                    this.write('"')
                } else {
                    this.visit(node.arguments[i])
                }
                if (i !== node.arguments.length - 1) {
                    this.write(',')
                }
            }
            this.write(']]')
            break
        case 'FilterSequence':
            this.write('[')
            for (var i = 0; i < node.sequence.length; i++) {
                this.visit(node.sequence[i])
                if (i !== node.sequence.length - 1) {
                    this.write(',')
                }
            }
            this.write(']')
            break
        case 'For':
            break
        case 'Identifier':
            this.write(this.ctx + '.')
            this.write(node.value)
            if (node.modifiers.length > 0) {
                for (var i = 0; i < node.modifiers.length; i++) {
                    this.visit(node.modifiers[i])
                }
            }
            break
        case 'If':
            break
        case 'Import':
            throw Error('Imports should have been resolved already.')
            break
        case 'Include':
            throw Error('Includes should have been resolved already.')
            break
        case 'Interpolation':
            this.pauseStr()
            if (node.filters !== null) {
                this.write(this.applyFn + '(')
                this.visit(node.name)
                if (node.arguments.length > 0) {
                    this.write('(')
                    for (var i = 0; i < node.arguments.length; i++) {
                        if (node.arguments[i].kind === 'String') {
                            this.write('"')
                            this.visit(node.arguments[i])
                            this.write('"')
                        } else {
                            this.visit(node.arguments[i])
                        }
                        if (i !== node.arguments.length - 1) {
                            this.write(',')
                        }
                    }
                    this.write(')')
                }
                this.write(',')
                this.visit(node.filters)
                this.write(')')
            } else {
                this.visit(node.name)
                if (node.arguments.length > 0) {
                    this.write('(')
                    for (var i = 0; i < node.arguments.length; i++) {
                        if (node.arguments[i].kind === 'String') {
                            this.write('"')
                            this.visit(node.arguments[i])
                            this.write('"')
                        } else {
                            this.visit(node.arguments[i])
                        }
                        if (i !== node.arguments.length - 1) {
                            this.write(',')
                        }
                    }
                    this.write(')')
                }
            }
            this.resumeStr()
            break
        case 'Modifier':
            this.write('[')
            if (node.value.kind === 'String') {
                this.write('"')
                this.visit(node.value)
                this.write('"')
            } else {
                this.visit(node.value)
            }
            this.write(']')
            break
        case 'Number':
            this.write(node.value)
            break
        case 'Path':
            break
        case 'Raw':
            break
        case 'String':
            this.write(node.value.replace(/\n/g, '\\n'))
            break
        case 'Tag':
            this.write('<' + node.name.value)
            if (node.attributes.length > 0) {
                this.visitEach(node.attributes)
            }
            if (elements.void[node.name.value]) {
                this.write('/>')
            } else {
                this.write('>')
                this.visit(node.inner)
                this.write('</' + node.name.value + '>')
            }
            break
        default:
            throw Error('No case for node of kind ' + node.kind)
    }
}

Compiler.prototype.compile = function() {
    var self = this
    this.visitEach(this.ast.contents)
    var o = 'function omelet(' + this.ctx + '){var ' + this.out + '="",' +
        this.ctx + '=' + this.ctx + '||{};' + '\n\n'
    o += this.out + '+="' + this.buffer.join('') + '";return out;}'
    return o
}

module.exports.compile = function(ast) {
    var fn = (new Compiler(ast)).compile()
    console.log('EVALed:\n\n'+eval('('+fn+')()'))
    return fn
}
