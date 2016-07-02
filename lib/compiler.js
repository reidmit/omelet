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
    void: {
        'area':1, 'base':1, 'br':1, 'col':1, 'embed':1,
        'hr':1, 'img':1, 'input':1, 'keygen':1, 'link':1,
        'meta':1, 'param':1, 'source':1, 'track':1, 'wbr':1
    },
    raw: {
        'script':1, 'style':1
    },
    escapableRaw: {
        'textarea':1, 'title':1
    }
}
var higherOrderFilters = {
    'map':1, 'filter':1, 'keep_if':1, 'for_each':1
}

function Compiler(ast, options) {
    this.ast = ast
    this.buffer = []
    this.line = 1
    this.indentLevel = 0

    // options
    options = options || {}
    this.prettyPrint = options.prettyPrint || false
    this.indentSize = options.indentSize || 4
    this.indentChar = options.indentChar || ' '
    this.templateFn = options.templateFn || 'omelet'

    this.lastVisited = { kind: null }

    this.runtimeMethods = {
        'Scope': 1, 'typeOf': 1, 'htmlEscape': 1,
        'applyFilters': 1
    }

    this.filtersUsed = {}
    this.filtersUsedCount = 0

    this.ctx = 'omelet$ctx'
    this.out = 'omelet$out'
    this.idx = 'omelet$idx'
    this.scope = 'omelet$scope'
    this.fltrs = 'filters'
    this.applyFn = 'omelet$runtime.applyFilters'
    this.escapeFn = 'omelet$runtime.htmlEscape'
}

Compiler.prototype = {

    constructor: Compiler,

    write: function(str) {
        this.buffer.push(str)
    },

    pauseStr: function() {
        this.write('"+')
    },

    resumeStr: function() {
        this.write('+"')
    },

    stopStr: function() {
        this.write('";\n')
    },

    startStr: function() {
        this.write(this.out + '+="')
    },

    restartStr: function() {
        this.write(';\n' + this.out + '+="')
    },

    writeIndent: function() {
        var indent = Array(this.indentLevel * this.indentSize + 1)
                        .join(this.indentChar)
        this.write('\\n' + indent)
    },

    buildRuntime: function() {
        var i = 0,
            rtStr = this.fltrs + '={',
            filtersUsed = Object.keys(this.filtersUsed),
            rtMethodNames = Object.keys(this.runtimeMethods)

        for (i = 0; i < filtersUsed.length; i++) {
            rtStr += filtersUsed[i] + ':' +
                     runtime.min.filters[filtersUsed[i]].toString() + ','
        }
        rtStr += '},omelet$runtime={'
        for (i = 0; i < rtMethodNames.length; i++) {
            rtStr += rtMethodNames[i] + ':' +
                     runtime.min[rtMethodNames[i]] + ','
        }
        rtStr += '}'
        return rtStr
    },

    visitEach: function(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            this.visit(nodes[i])
        }
    },

    visit: function(node) {
        var i, kind

        switch (node.kind) {
            case 'Attribute':
                this.write(' ')
                this.visit(node.name)
                this.write('=\\\"')
                this.visit(node.value)
                this.write('\\\"')
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
                this.stopStr()
                this.write(this.scope + '.add("' + node.name.value + '",')
                if (node.parameters.length === 0) {
                    kind = node.body.kind
                    if (kind === 'String' || kind === 'Block') {
                        this.write('"')
                        this.visit(node.body)
                        this.write('"')
                    } else {
                        this.visit(node.body)
                    }
                } else {
                    var params = []
                    this.write('function(args){')
                    this.write(this.scope + '.open();\n')
                    for (i = 0; i < node.parameters.length; i++) {
                        var param = node.parameters[i].value
                        params.push(param)
                        this.write(this.scope + '.add("' + param + '",args[' + i + ']||args["' + param + '"]);\n')
                    }
                    this.write('var ret=')
                    kind = node.body.kind
                    if (kind === 'String' || kind === 'Block') {
                        this.write('"')
                        this.visit(node.body)
                        this.write('"')
                    } else {
                        this.visit(node.body)
                    }
                    this.write(';\n' + this.scope + '.close();\nreturn ret;\n}')
                }
                this.write(')')
                this.restartStr()
                break
            case 'Dictionary':
                this.write('{')
                for (i = 0; i < node.entries.length; i++) {
                    this.write('"' + node.entries[i].name.value + '":')

                    if (node.entries[i].parameters.length === 0) {
                        kind = node.entries[i].body.kind
                        if (kind === 'String' || kind === 'Block') {
                            this.write('"')
                            this.visit(node.entries[i].body)
                            this.write('"')
                        } else {
                            this.visit(node.entries[i].body)
                        }
                    } else {
                        var params = []
                        this.write('function(')
                        for (j = 0; j < node.entries[i].parameters.length; j++) {
                            params.push(node.entries[i].parameters[j].value)
                            this.write(node.entries[i].parameters[j].value)

                            if (j !== node.entries[i].parameters.length - 1) {
                                this.write(',')
                            }
                        }
                        this.write('){\n' + this.scope + '.open();\n')
                        for (j = 0; j < params.length; j++) {
                            this.write(this.scope + '.add("' + params[j] + '",' + params[j] + ');\n')
                        }
                        this.write('\nvar ret=')
                        kind = node.entries[i].body.kind
                        if (kind === 'String' || kind === 'Block') {
                            this.write('"')
                            this.visit(node.entries[i].body)
                            this.write('"')
                        } else {
                            this.visit(node.entries[i].body)
                        }
                        this.write(';\n' + this.scope + '.close();\nreturn ret;\n}')
                    }

                    if (i !== node.entries.length - 1) {
                        this.write(',')
                    }
                }
                this.write('}')
                break
            case 'Doctype':
                this.write(__.doctype(node.name.value))
                if (this.prettyPrint) {
                    this.write('\\n')
                }
                break
            case 'Filter':
                if (runtime.filters[node.name.value] === undefined) {
                    throw Error('Cannot apply unrecognized filter \'' +
                                    node.name.value + '\'.')
                }

                this.filtersUsedCount++
                this.filtersUsed[node.name.value] = true
                this.write('["' + node.name.value + '",[')
                for (i = 0; i < node.arguments.length; i++) {
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
                for (i = 0; i < node.sequence.length; i++) {
                    this.visit(node.sequence[i])
                    if (i !== node.sequence.length - 1) {
                        this.write(',')
                    }
                }
                this.write(']')
                break
            case 'For':
                this.stopStr()
                if (node.data.kind === 'List') {
                    this.write(this.scope + '.open();\n' +
                                this.scope + '.add("' + node.filePath + '",')
                    this.visit(node.data)
                    this.write(');\n')
                }
                this.write('for(' + this.idx + '=0;' + this.idx + '<')
                if (node.filters !== null) {
                    this.write(this.applyFn + '(')
                    this.visit(node.data)
                    this.write(',')
                    this.visit(node.filters)
                    this.write(')')
                } else {
                    if (node.data.kind !== 'List') {
                        this.visit(node.data)
                    } else {
                        this.write(this.scope + '.find("' + node.filePath + '")')
                    }
                }
                if (node.data.kind === 'List') {
                    this.write('.length;' + this.idx + '++){\n' + this.scope + '.open();\n' +
                                this.scope + '.add("' + node.iterator.value + '",' +
                                this.scope + '.find("' + node.filePath + '")[' + this.idx +
                                ']);\n')
                } else {
                    this.write('.length;' + this.idx + '++){\n' + this.scope + '.open();\n' +
                                this.scope + '.add("' + node.iterator.value + '",' +
                                this.scope + '.find("' + node.data.value + '")[' + this.idx +
                                ']);\n')
                }
                this.startStr()
                this.visit(node.body)
                this.stopStr()
                this.write(this.scope + '.close();\n}\n')
                if (node.data.kind === 'List') {
                    this.write(this.scope + '.close();\n')
                }
                this.startStr()
                break
            case 'Identifier':
                this.write(this.scope + '.find("' + node.value + '")')
                if (node.modifiers.length > 0) {
                    for (i = 0; i < node.modifiers.length; i++) {
                        this.visit(node.modifiers[i])
                    }
                }
                break
            case 'If':
                this.stopStr()
                if (node.negated) {
                    this.write('if(runtime.falsy(')
                } else {
                    this.write('if(runtime.truthy(')
                }
                if (node.filters !== null) {
                    this.write(this.applyFn + '(')
                    this.visit(node.predicate)
                    this.write(',')
                    this.visit(node.filters)
                    this.write(')')
                } else {
                    this.visit(node.predicate)
                }
                this.write(')) {\n')
                if (node.thenCase !== null) {
                    this.startStr()
                    this.visit(node.thenCase)
                    this.stopStr()
                }
                this.write('}\n')
                if (node.elseCase !== null) {
                    this.write('else{\n')
                    this.startStr()
                    this.visit(node.elseCase)
                    this.stopStr()
                    this.write('}\n')
                }
                this.startStr()
                break
            case 'Interpolation':
                if ((this.lastVisited.kind === 'String' ||
                    this.lastVisited.kind === 'Interpolation') &&
                    node.lineEnd > this.lastVisited.lineEnd) {
                    this.writeIndent()
                }
                this.pauseStr()
                if (node.leaveUnescaped === false) {
                    this.write(this.escapeFn + '(')
                }
                if (node.filters !== null) {
                    this.write(this.applyFn + '(')
                }
                this.visit(node.name)
                if (node.positionalArgs && node.arguments.length > 0) {
                    this.write('({')
                    for (i = 0; i < node.arguments.length; i++) {
                        this.write(i + ':')
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
                    this.write('})')
                } else if (node.context !== null) {
                    this.write('(')
                    this.visit(node.context)
                    this.write(')')
                }
                if (node.filters !== null) {
                    this.write(',')
                    this.visit(node.filters)
                    this.write(')')
                }
                if (node.leaveUnescaped === false) {
                    this.write(')')
                }
                this.resumeStr()
                break
            case 'List':
                this.write('[')
                for (i = 0; i < node.elements.length; i++) {
                    if (i !== 0) {
                        this.write(',')
                    }
                    this.visit(node.elements[i])
                }
                this.write(']')
                break
            case 'ListElement':
                kind = node.body.kind
                if (kind === 'String' || kind === 'Block') {
                    this.write('"')
                    this.visit(node.body)
                    this.write('"')
                } else {
                    this.visit(node.body)
                }
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
            case 'Raw':
                this.write(node.value)
                break
            case 'String':
                if ((this.lastVisited.kind === 'String' ||
                    this.lastVisited.kind === 'Interpolation') &&
                    node.lineEnd > this.lastVisited.lineEnd) {
                    this.writeIndent()
                }
                this.write(__.jsEscape(node.value))
                break
            case 'Tag':
                this.write('<' + node.name)
                if (node.attributes.length > 0) {
                    this.visitEach(node.attributes)
                }
                if (elements.void[node.name]) {
                    this.write('/>')
                } else {
                    this.write('>')
                    if (this.prettyPrint) {
                        if (node.tagStyle === 'block') {
                            this.indentLevel++
                            this.writeIndent()
                        }
                    }
                    this.visit(node.inner)
                    if (this.prettyPrint) {
                        if (node.tagStyle === 'block') {
                            this.indentLevel--
                            this.writeIndent()
                        }
                    }
                    this.write('</' + node.name + '>')
                }
                break
            case 'Include':
            case 'Import':
            case 'Extend':
            case 'Path':
                throw Error(node.kind + ' nodes should have been resolved by linker before compiling.')
            default:
                throw Error('No case for node of kind ' + node.kind + '.')
        }

        this.lastVisited = node
    },

    compile: function() {
        this.visitEach(this.ast.contents)

        var fn = (new Function('{return ' +
            'function ' + this.templateFn + '(' + this.ctx + '){\n' +
                'var ' + this.out + '="",' + this.idx + '=0,' +
                this.buildRuntime() + ',' +
                this.ctx + '=' + this.ctx + '||{},' +
                this.scope + '=new omelet$runtime.Scope();\n' +
                this.scope + '.addAll(' + this.ctx + ');\n' +
                this.out + '+="' + this.buffer.join('') + '";\n' +
                'return ' + this.out + ';}' +
            ';}'))()

        return fn
    }
}

module.exports.compile = function(ast, options) {
    return (new Compiler(ast, options)).compile()
}
