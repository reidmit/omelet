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
        this.visitEach(node.elements)
        break
    case 'ArrayElement':
        this.visit(node.value)
        break
    case 'Attribute':
        // done
        break
    case 'Block':
        this.visitEach(node.contents)
        break
    case 'Boolean':
        // done
        break
    case 'Comment':
        // done
        break
    case 'Definition':
        this.visitEach(node.body)
        break
    case 'Dictionary':
        this.visitEach(node.entries)
        break
    case 'Doctype':
        // done
        break
    case 'Extend':
        var newAST = this.fileToAst(node.file.value)
        var localDefs = this.astToDictionaryNode(this.ast).entries
        this.ast = newAST
        this.ast.contents = localDefs.concat(this.ast.contents)
        break
    case 'Filter':
        // done
        break
    case 'FilterSequence':
        // done
        break
    case 'For':
        // COME BACK TO THIS (resolve Path in data)
        this.visit(node.body)
        break
    case 'Identifier':
        // done
        break
    case 'If':
        if (node.thenCase) {
            this.visit(node.thenCase)
        }
        this.visitEach(node.elifCases)
        if (node.elseCase) {
            this.visit(node.elseCase)
        }
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
        if (node.included.kind === 'Path') {
            var ast = this.fileToAst(node.included.value)
            var localDefs = node.context
            ast.contents = localDefs.concat(ast.contents)
            var fn = compiler.compile(ast)
            node.kind = 'String'
            node.value = fn({})
        } else {
            var name = node.included
            node.included = undefined
            node.kind = 'Interpolation'
            node.name = name
            node.positionalArgs = false
            node.arguments = null
            node.filters = null
            node.context = {
                kind: 'Dictionary',
                entries: node.context
            }
        }
        break;
    case 'Interpolation':
        // done
        break
    case 'Modifier':
        // done
        break
    case 'Number':
        // done
        break
    case 'Path':
        break
    case 'Raw':
        // done
        break
    case 'String':
        // done
        break
    case 'Tag':
        this.visit(node.inner)
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