/*
-----------------------------------------------------------------------------
OMELET LINKER

Given a parsed AST, walk the tree and resolve any dependencies on external
files by grabbing the contents of those files from the file system. The
linker modifies the AST. When linking is finished, the AST should contain
no Include, Import, Extend, or Path nodes.
-----------------------------------------------------------------------------
*/
var fs = require('fs')
var path = require('path')
var parser = require('./parser.js')
var preprocessor = require('./preprocessor.js')
var compiler = require('./compiler.js')

function Linker(ast, inputFile) {
    this.ast = ast
    this.inputFile = inputFile
    this.addFront = []
}

Linker.prototype.getFileContents = function(relativePath) {
    var fullPath = path.join(path.dirname(this.inputFile), relativePath)
    if (path.extname(fullPath) === '') {
        fullPath += '.om'
    }
    try {
        return fs.readFileSync(fullPath, 'utf8')
    } catch (e) {
        throw e
    }
}

Linker.prototype.astToDictionaryNode = function(ast) {
    var defs = []
    for (var i = 0; i < ast.contents.length; i++) {
        if (ast.contents[i].kind === 'Definition') {
            defs.push(ast.contents[i])
        }
    }
    return {
        kind: 'Dictionary',
        entries: defs
    }
}

Linker.prototype.visitEach = function(nodes) {
    for (var i = 0; i < nodes.length; i++) {
        this.visit(nodes[i])
    }
}

Linker.prototype.visit = function(node) {
    var i, kind
    switch (node.kind) {
    case 'Array':
        break
    case 'ArrayElement':
        break
    case 'Attribute':
        break
    case 'Block':
        break
    case 'Boolean':
        break
    case 'Comment':
        break
    case 'Definition':
        break
    case 'Dictionary':
        break
    case 'Doctype':
        break
    case 'Extend':
        throw Error('Extends should have been resolved already.')
    case 'Filter':
        break
    case 'FilterSequence':
        break
    case 'For':
        break
    case 'Identifier':
        break
    case 'If':
        break
    case 'Import':
        var str = this.getFileContents(node.file.value)
        str = preprocessor.preprocess(str)
        var ast = parser.parse(str)

        this.addFront.push({
            kind: 'Definition',
            name: {
                kind: 'Identifier',
                value: node.alias.value,
                modifiers: []
            },
            parameters: [],
            body: this.astToDictionaryNode(ast)
        })
        break
    case 'Include':
        throw Error('Includes should have been resolved already.')
    case 'Interpolation':
        break
    case 'Modifier':
        break
    case 'Number':
        break
    case 'Path':
        break
    case 'Raw':
        break
    case 'String':
        break
    case 'Tag':
        break
    default:
        throw Error('No case for node of kind ' + node.kind)
    }
}

Linker.prototype.link = function() {
    this.visitEach(this.ast.imports)
    this.visitEach(this.ast.contents)
    this.ast.imports = []
    for (i = this.addFront.length - 1; i >= 0; i--) {
        this.ast.contents.unshift(this.addFront[i])
    }
    return this.ast
}

module.exports.link = function(ast, inputFile) {
    return (new Linker(ast, inputFile)).link()
}