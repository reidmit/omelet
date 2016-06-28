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
var pathModule = require('path')
var errors = require('./errors.js')
var lexer = require('./lexer.js')
var parser = require('./parser.js')
var omelet = require('./omelet.js')
var runtime = require('./runtime.js')
var compiler = require('./compiler.js')

function Linker(ast, inputFile) {
    this.ast = ast
    this.inputFile = inputFile
    this.currentNode
    this.addFront = []
}

Linker.prototype.error = function(message, line) {
    var err = errors.buildError(
        'Linker error',
        message,
        line,
        '')
    throw err
}

Linker.prototype.getFullPathTo = function(relativePath, isDir) {
    var fullPath = pathModule.join(pathModule.dirname(this.inputFile), relativePath)
    if (!isDir && pathModule.extname(fullPath) === '') {
        fullPath += '.om'
    }
    return fullPath
}

Linker.prototype.getFileContents = function(path, isAbsolutePath) {
    var fullPath = isAbsolutePath ? path
                                  : this.getFullPathTo(path)
    try {
        return fs.readFileSync(fullPath, 'utf8')
    } catch (e) {
        throw e
    }
}

Linker.prototype.fileToAst = function(path, isAbsolutePath) {
    var str = this.getFileContents(path, isAbsolutePath),
        tokens = lexer.lex(str)
    return parser.parse(tokens)
}

Linker.prototype.directoryToAst = function(path) {
    var fullPath = this.getFullPathTo(path, true)

    try {
        var isDirectory = fs.lstatSync(fullPath).isDirectory()
    } catch (e) {
        if (e.code === 'ENOENT') {
            this.error('Directory \'' + relativePath + '\' does not exist.', this.currentNode.line)
        } else {
            throw e
        }
    }
    if (!isDirectory) {
        this.error('\'' + relativePath + '\' is not a directory.' +
            ' For loops cannot iterate over files (only directories ' +
            'or variables).', this.currentNode.line)
    }

    var filesAsAsts = []

    var files = fs.readdirSync(fullPath)

    for (var i = 0; i < files.length; i++) {
        var name = files[i],
            filePath = pathModule.join(fullPath, name),
            stat = fs.statSync(filePath)
        if (name.lastIndexOf('.om') === name.length - 3
            && stat.isFile()) {
            var fileAst = this.fileToAst(filePath, true)
            var dictNode = this.astToDictionaryNode(fileAst)
            filesAsAsts.push({
                kind: 'ListElement',
                body: dictNode,
                line: this.currentNode.line,
                lineEnd: this.currentNode.line
            })
        }
    }

    return {
        kind: 'List',
        elements: filesAsAsts,
        line: this.currentNode.line,
        lineEnd: this.currentNode.line
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
        entries: defs,
        line: this.currentNode.line,
        lineEnd: this.currentNode.line
    }
}

Linker.prototype.visitEach = function(nodes) {
    for (var i = 0; i < nodes.length; i++) {
        this.visit(nodes[i])
    }
}

Linker.prototype.visit = function(node) {
    this.currentNode = node
    var i, kind
    switch (node.kind) {
    case 'List':
        this.visitEach(node.elements)
        break
    case 'ListElement':
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
        if (node.data.kind === 'Path') {
            var filePath = node.data.value
            var directoryAST = this.directoryToAst(node.data.value)

            node.data = directoryAST
            node.filePath = filePath

            this.visit(node.body) // something?
        } else {
            this.visit(node.body)
        }
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
        this.error('No case for node of kind ' + node.kind)
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