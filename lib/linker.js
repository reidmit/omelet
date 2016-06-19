/*
-----------------------------------------------------------------------------
OMELET LINKER

Given a parsed AST, walk the tree and resolve any dependencies on external
files by grabbing the contents of those files from the file system. The
linker modifies the AST. When linking is finished, the AST should not contain
any Include, Import, Extend, or Path nodes.
-----------------------------------------------------------------------------
*/
var fs = require('fs')
var path = require('path')
var parser = require('./parser.js')
var omelet = require('./omelet.js')
var runtime = require('./runtime.js')
var preprocessor = require('./preprocessor.js')
var compiler = require('./compiler.js')

function Linker(ast, inputFile) {
    this.ast = ast
    this.inputFile = inputFile
    this.addFront = []
}

Linker.prototype.getFullPathTo = function(relativePath) {
    var fullPath = path.join(path.dirname(this.inputFile), relativePath)
    if (path.extname(fullPath) === '') {
        fullPath += '.om'
    }
    return fullPath
}

Linker.prototype.getFileContents = function(relativePath) {
    var fullPath = this.getFullPathTo(relativePath)
    try {
        return fs.readFileSync(fullPath, 'utf8')
    } catch (e) {
        throw e
    }
}

Linker.prototype.fileToAst = function(relativePath) {
    var str = this.getFileContents(relativePath)
    str = preprocessor.preprocess(str)
    return parser.parse(str)
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
        var newAST = this.fileToAst(node.file.value)
        var localDefs = this.astToDictionaryNode(this.ast).entries
        this.ast = newAST
        this.ast.contents = localDefs.concat(this.ast.contents)
        break
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
        var ast = this.fileToAst(node.file.value)
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
        var ast = this.fileToAst(node.included.value)
        var localDefs = node.context
        ast.contents = localDefs.concat(ast.contents)
        var fn = compiler.compile(ast)
        node.kind = 'String'
        node.value = fn({},runtime)
        break;
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
    if (this.ast.extend !== null) {
        this.visit(this.ast.extend)
        return this.ast
    }
    this.visitEach(this.ast.imports)
    this.visitEach(this.ast.contents)
    this.ast.imports = []
    this.ast.contents = this.addFront.concat(this.ast.contents)
    return this.ast
}

module.exports.link = function(ast, inputFile) {
    return (new Linker(ast, inputFile)).link()
}