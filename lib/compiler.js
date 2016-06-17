/*
-----------------------------------------------------------------------------
OMELET COMPILER

Transforms a parsed Omelet AST into a JavaScript function that takes in a
context object.
-----------------------------------------------------------------------------
*/
var __ = require('./util.js')

var elements = {
    void: {'area':1,'base':1,'br':1,'col':1,'embed':1,'hr':1,'img':1,'input':1,'keygen':1,'link':1,'meta':1,'param':1,'source':1,'track':1,'wbr':1},
    raw: {'script':1,'style':1},
    escapableRaw: {'textarea':1,'title':1}
}

function Compiler(ast) {
    this.ast = ast
    this.buffer = []
    this.filtersUsed = []
    this.filtered = ''
    this.ctx = 'context'
    this.out = 'out'
}

Compiler.prototype.write = function(str) {
    this.buffer.push(str)
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
                this.visit(node.elements[i].value)
            }
            this.write(']')
            break
        case 'ArrayElement':
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
            this.write('";\n')
            this.write(this.ctx+'.'+node.name.value+'=')
            if (node.parameters.length === 0) {
                // we're writing a literal object
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
            this.write(';\n'+this.out+'+="')
            break
        case 'Dictionary':
            this.write('{')
            for (var i = 0; i < node.entries.length; i++) {
                this.write('"' + node.entries[i].name.value + '"')
                this.write(':')
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
            break
        case 'Filter':
            break
        case 'FilterSequence':
            // for (var i = 0; i < node.sequence.length; i++) {
            //     this.filtersUsed.push(node.sequence[i].name.value)
            //     this.filtered = node.sequence[i].name.value + '(' +
            //                     this.filtered +
            //                     ')'
            //     // TODO: fix this! names of variables and params are not right
            //     // can't just append as string - need to visit the node

            //     if (i === node.sequence.length - 1) {
            //         this.write(this.filtered)
            //         this.filtered = ''
            //     }
            // }

            // this.visit()
            break
        case 'For':
            break
        case 'Identifier':
            this.write(this.ctx+'.')
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
            break
        case 'Include':
            break
        case 'Interpolation':
            this.write('"+')
            if (node.filters !== null) {
                var filters = node.filters.sequence
                for (var i = filters.length - 1; i >= 0; i--) {
                    this.write(filters[i].name.value + '(')
                }
                this.visit(node.name)
                for (var i = 0; i < filters.length; i++) {
                    for (var j = 0; j < filters[i].arguments.length; j++) {
                        this.write(',')
                        if (filters[i].arguments[j].kind === 'String') {
                            this.write('"')
                            this.visit(filters[i].arguments[j])
                            this.write('"')
                        } else {
                            this.visit(filters[i].arguments[j])
                        }
                    }
                    this.write(')')
                }
            }
            this.write('+"')
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
            this.write(node.value)
            break
        case 'Tag':
            this.write('<')
            this.write(node.name.value)
            if (node.attributes.length > 0) {
                this.visitEach(node.attributes)
            }
            if (elements.void[node.name.value]) {
                this.write('/>')
            } else {
                this.write('>')
                this.visit(node.inner)
                this.write('</')
                this.write(node.name.value)
                this.write('>')
            }
            break
        default:
            throw Error('No case for node of kind ' + node.kind)
    }
}

Compiler.prototype.compile = function() {
    //could prob. make these this.write() calls
    this.visitEach(this.ast.contents)
    return 'function('+this.ctx+'){var '+this.out+'="",'+
        this.ctx+'='+this.ctx+'||{};\n\n'+this.out+'+="'+
        this.buffer.join('')+'";\n\nreturn out;}'
}

module.exports.compile = function(ast) {
    return (new Compiler(ast)).compile()
}
