/*
-----------------------------------------------------------------------------
OMELET COMPILER

Transforms an Omelet parse tree into a JavaScript function that takes in a
context object and returns a string.
-----------------------------------------------------------------------------
*/
var __ = require('./util.js')
var errors = require('./errors.js')
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

function Compiler(ast, options) {
    this.ast = ast
    this.buffer = []
    this.line = 1
    this.indentLevel = 0

    // options
    options = options || {}
    this.fileName = options.fileName
    this.originalCode = options.source || ''
    this.indentSize = options.indentSize || 4
    this.indentChar = options.indentChar || ' '
    this.templateFn = options.templateName || 'omelet'
    this.modes = options.modes || {}

    this.lastVisited = { kind: null }

    this.runtimeMethods = {
        'Scope': 1, 'typeOf': 1, 'htmlEscape': 1,
        'applyFilters': 1, 'buildError': 1,
        'truthy': 1, 'falsy': 1
    }

    this.tagScope = new runtime.Scope()

    this.filtersUsed = {}
    this.filtersUsedCount = 0
    this.canInsertIndent = true
    this.inBlockDefStk = []

    this.ctx = 'omelet$ctx'
    this.out = 'omelet$out'
    this.idx = 'omelet$idx'
    this.scope = 'omelet$scope'
    this.source = 'omelet$source'
    this.range = 'omelet$range'
    this.fltrs = 'filters'
    this.applyFn = 'runtime.applyFilters'
    this.escapeFn = 'runtime.htmlEscape'
}

Compiler.prototype = {

    constructor: Compiler,

    error: function(message, line) {
        var err = errors.buildError(
            'Compiler error',
            message,
            line || 0,
            this.originalCode,
            this.fileName
        )
        throw err
    },

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
        if (this.inBlockDefStk.length > 0) {
            this.write(';\nret+="')
        } else {
            this.write(';\n' + this.out + '+="')
        }
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
                     runtime.filters[filtersUsed[i]].toString() + ','
        }
        rtStr += '},runtime={'
        for (i = 0; i < rtMethodNames.length; i++) {
            rtStr += rtMethodNames[i] + ':' +
                     runtime[rtMethodNames[i]] + ','
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
        var i, j, kind, param, params, tempValues = []

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
                if (node.style === 'tag') {
                    this.tagScope.add(node.name, node.body)
                    break
                }
                this.stopStr()
                this.write(this.scope + '.add("' + node.name.value + '",')
                kind = node.body.kind
                if (kind === 'Block') {
                    params = []
                    if (node.parameters.length === 0) {
                        this.write('(function(){')
                    } else {
                        this.write('function(args){')
                    }
                    this.write(this.scope + '.open();\n')
                    for (i = 0; i < node.parameters.length; i++) {
                        param = node.parameters[i].value
                        params.push(param)
                        this.write(this.scope + '.add("' + param + '",args[' + i + ']||args["' + param + '"]);\n')
                    }
                    this.write('var ret="')
                    this.inBlockDefStk.push(true)
                    kind = node.body.kind
                    this.visit(node.body)
                    this.inBlockDefStk.pop()
                    this.write('";\n' + this.scope + '.close();\nreturn ret;\n}')
                    if (node.parameters.length === 0) {
                        this.write(')())')
                    } else {
                        this.write(')')
                    }
                } else if (kind === 'String') {
                    this.write('"')
                    this.visit(node.body)
                    this.write('")')
                } else {
                    this.visit(node.body)
                    this.write(')')
                }
                this.startStr()
                break
            case 'Dictionary':
                this.write('{')
                for (i = 0; i < node.entries.length; i++) {
                    this.write('"' + node.entries[i].name.value + '":')
                    kind = node.entries[i].body.kind
                    if (kind === 'Block') {
                        if (node.entries[i].parameters.length === 0) {
                            this.write('(function(){')
                        } else {
                            this.write('function(args){')
                        }
                        this.write(this.scope + '.open();\n')
                        for (j = 0; j < node.entries[i].parameters.length; j++) {
                            param = node.entries[i].parameters[j].value
                            this.write(this.scope + '.add("' + param + '",args[' + j + ']||args["' + param + '"]);\n')
                        }
                        this.write('var ret="')
                        this.inBlockDefStk.push(true)
                        kind = node.entries[i].body.kind
                        this.visit(node.entries[i].body)
                        this.inBlockDefStk.pop()
                        this.write('";\n' + this.scope + '.close();\nreturn ret;\n}')
                        if (node.entries[i].parameters.length === 0) {
                            this.write(')()')
                        }
                    } else if (kind === 'String') {
                        this.write('"')
                        this.visit(node.entries[i].body)
                        this.write('"')
                    } else {
                        this.visit(node.entries[i].body)
                    }

                    if (i !== node.entries.length - 1) {
                        this.write(',')
                    }
                }
                this.write('}')
                break
            case 'Doctype':
                this.write(__.doctype(node.name.value))
                break
            case 'Filter':
                if (runtime.filters[node.name.value] === undefined) {
                    this.error('Cannot apply unrecognized filter \'' +
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
                this.write('for(' + this.idx + '=0;' + this.idx + '<')
                if (node.filters !== null) {
                    this.write(this.applyFn + '(')
                    this.visit(node.data)
                    this.write(',')
                    this.visit(node.filters)
                    this.write(',"' + this.fileName + '",' +
                                this.source + ',' + node.filters.line + ')')
                } else {
                    this.visit(node.data)
                }
                if (node.filters !== null) {
                    this.write('.length;' + this.idx + '++){\n' + this.scope + '.open();\n' +
                                this.scope + '.add("' + node.iterator.value + '",')
                    this.write(this.applyFn + '(')
                    this.visit(node.data)
                    this.write(',')
                    this.visit(node.filters)
                    this.write(',"' + this.fileName + '",' +
                                this.source + ',' + node.filters.line + ')[' + this.idx + ']);\n')
                } else {
                    this.write('.length;' + this.idx + '++){\n' +
                                this.scope + '.open();\n' +
                                this.scope + '.add("' + node.iterator.value + '",')
                    this.visit(node.data)
                    this.write('[' + this.idx + ']);\n')
                }
                this.startStr()
                this.visit(node.body)
                this.writeIndent()
                this.stopStr()
                this.write(this.scope + '.close();\n}\n')
                this.startStr()
                break
            case 'Identifier':
                this.canInsertIndent = false
                this.write(this.scope + '.find("' + node.value + '"')
                if (node.modifiers.length > 0) {
                    for (i = 0; i < node.modifiers.length; i++) {
                        this.write(',')
                        this.visit(node.modifiers[i])
                    }
                }
                this.write(')')
                this.canInsertIndent = true
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
                    this.write(',"' + this.fileName + '",' +
                                this.source + ',' + node.filters.line + ')')
                } else {
                    this.visit(node.predicate)
                }
                this.write(')) {\n')
                this.write(this.scope + '.open();\n')
                if (node.thenCase !== null) {
                    this.startStr()
                    this.visit(node.thenCase)
                    this.stopStr()
                }
                this.write(this.scope + '.close();\n')
                this.write('}\n')

                if (node.elifCases.length > 0) {
                    for (i = 0; i < node.elifCases.length; i++) {
                        var nodey = node.elifCases[i]
                        if (nodey.negated) {
                            this.write('else if(runtime.falsy(')
                        } else {
                            this.write('else if(runtime.truthy(')
                        }
                        if (nodey.filters !== null) {
                            this.write(this.applyFn + '(')
                            this.visit(nodey.predicate)
                            this.write(',')
                            this.visit(nodey.filters)
                            this.write(',"' + this.fileName + '",' +
                                        this.source + ',' + nodey.filters.line + ')')
                        } else {
                            this.visit(nodey.predicate)
                        }
                        this.write(')) {\n')
                        this.write(this.scope + '.open();\n')
                        if (nodey.thenCase !== null) {
                            this.startStr()
                            this.visit(nodey.thenCase)
                            this.stopStr()
                        }
                        this.write(this.scope + '.close();\n')
                        this.write('}\n')
                    }
                }

                if (node.elseCase !== null) {
                    this.write('else{\n')
                    this.write(this.scope + '.open();\n')
                    this.startStr()
                    this.visit(node.elseCase)
                    this.stopStr()
                    this.write(this.scope + '.close();\n')
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
                if (!this.ast.topLevelDefinitions[node.name.value]) {
                    if (node.leaveUnescaped === false) {
                        this.write(this.escapeFn + '(')
                    }
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
                    this.write(',"' + this.fileName + '",' +
                                this.source + ',' + node.filters.line + ')')
                }
                if (!this.ast.topLevelDefinitions[node.name.value]) {
                    if (node.leaveUnescaped === false) {
                        this.write(')')
                    }
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
                if (kind === 'Block') {
                    this.write('(function(){')
                    this.write(this.scope + '.open();\n')
                    this.write('var ret="')
                    this.inBlockDefStk.push(true)
                    kind = node.body.kind
                    this.visit(node.body)
                    this.inBlockDefStk.pop()
                    this.write('";\n' + this.scope + '.close();\nreturn ret;\n}')
                    this.write(')()')
                } else if (kind === 'String') {
                    this.write('"')
                    this.visit(node.body)
                    this.write('"')
                } else {
                    this.visit(node.body)
                }
                break
            case 'Mode':
                var output
                if (this.modes[node.name] &&
                    typeof this.modes[node.name] === 'function') {
                    output = this.modes[node.name](node.value)
                } else {
                    output = node.value
                }
                var lines = output.split('\n')
                for (i = 0; i < lines.length; i++) {
                    this.write(__.jsEscape(lines[i]))
                    this.writeIndent()
                }
                break
            case 'Modifier':
                if (node.value.kind === 'String') {
                    this.write('"')
                    this.visit(node.value)
                    this.write('"')
                } else {
                    this.visit(node.value)
                }
                break
            case 'Number':
                this.write(node.value)
                break
            case 'Range':
                tempValues = []
                if (node.startValue <= node.endValue) {
                    for (i = node.startValue; i <= node.endValue; i++) {
                        tempValues.push(i)
                    }
                } else {
                    for (i = node.startValue; i >= node.endValue; i--) {
                        tempValues.push(i)
                    }
                }
                this.write(JSON.stringify(tempValues))
                break
            case 'String':
                if (this.canInsertIndent &&
                    (this.lastVisited.kind === 'String' ||
                    this.lastVisited.kind === 'Interpolation') &&
                    node.lineEnd > this.lastVisited.lineEnd) {
                    this.writeIndent()
                }
                this.write(__.jsEscape(node.value))
                break
            case 'Tag':
                var definedTag = false, found
                try {
                    found = this.tagScope.find(node.name)
                } catch (e) {
                    found = false
                }

                if (found) {
                    definedTag = JSON.parse(JSON.stringify(found))
                }

                if (definedTag) {
                    var savedInner = node.inner,
                        savedAttrs = node.attributes
                    __.insertInnerAndAttrs(definedTag, savedInner, savedAttrs)
                    node = definedTag
                }

                if (node.line > this.lastVisited.lineEnd) {
                    this.writeIndent()
                }

                this.write('<' + node.name)
                if (node.attributes.length > 0) {
                    this.visitEach(node.attributes)
                }
                if (elements.void[node.name]) {
                    this.write('/>')
                } else {
                    this.write('>')
                    if (node.tagStyle === 'block') {
                        this.stopStr()
                        this.write(this.scope + '.open()')
                        this.startStr()
                    }

                    if (node.tagStyle === 'block') {
                        this.indentLevel++
                    }

                    this.visit(node.inner)

                    if (node.tagStyle === 'block') {
                        this.indentLevel--
                        this.writeIndent()
                    }

                    if (node.tagStyle === 'block') {
                        this.stopStr()
                        this.write(this.scope + '.close()')
                        this.startStr()
                    }

                    this.write('</' + node.name + '>')
                    //
                    // if (node.tagStyle === 'line') {
                    //     this.writeIndent()
                    // }
                }
                break
            case 'Include':
            case 'Import':
            case 'Extend':
            case 'Path':
                this.error(node.kind + ' nodes should have been resolved by linker before compiling.')
                break
            default:
                this.error('No case for node of kind ' + node.kind + '.')
        }

        this.lastVisited = node
    },

    compile: function() {
        this.visitEach(this.ast.contents)
        var fnBody = '{return ' +
            'function ' + this.templateFn + '(' + this.ctx + '){\n' +
                'var ' + this.out + '="",' + this.idx + '=0,' +
                this.buildRuntime() + ',' +
                this.ctx + '=' + this.ctx + '||{},' +
                this.scope + '=new runtime.Scope(),' +
                this.source + '="' + __.jsEscape(this.originalCode) + '";\n' +
                this.scope + '.addAll(' + this.ctx + ');\n' +
                this.out + '+="' + this.buffer.join('') + '";\n' +
                'return ' + this.out + '.replace(\/\\n[ ]*\\n\/g, "\\n");}' +
            ';}'
        var fn = (new Function(fnBody))()

        return fn
    }
}

module.exports.compile = function(ast, options) {
    return (new Compiler(ast, options)).compile()
}
