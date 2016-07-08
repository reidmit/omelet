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
var linker = require('./linker.js')
var omelet = require('./omelet.js')
var runtime = require('./runtime.js')
var compiler = require('./compiler.js')

function Linker(ast, options) {
    this.ast = ast

    //options
    options = options || {}
    this.inputFile = options.filePath || ''

    this.currentNode
    this.addFront = []
}

Linker.prototype = {

    error: function(message, line) {
        var err = errors.buildError(
            'Linker error',
            message,
            line,
            '')
        throw err
    },

    getFullPathTo: function(relativePath, isDir) {
        var fullPath = pathModule.join(pathModule.dirname(this.inputFile), relativePath)
        if (!isDir && pathModule.extname(fullPath) === '') {
            fullPath += '.om'
        }
        return fullPath
    },

    getFileContents: function(path, isAbsolutePath) {
        var fullPath = isAbsolutePath ? path : this.getFullPathTo(path)
        try {
            return fs.readFileSync(fullPath, 'utf8')
        } catch (e) {
            throw e
        }
    },

    fileToAst: function(path, isAbsolutePath) {
        var options = {
            filePath: isAbsolutePath ? path : this.getFullPathTo(path)
        }
        var str = this.getFileContents(path, isAbsolutePath),
            tokens = lexer.lex(str, options),
            ast = parser.parse(tokens, options),
            linkedAst = linker.link(ast, options)
        return linkedAst
    },

    directoryToListNode: function(path) {
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
    },

    astToDictionaryNode: function(ast, tagDefsOnly) {
        var defs = []
        for (var i = 0; i < ast.contents.length; i++) {
            if (ast.contents[i].kind === 'Definition') {
                if (tagDefsOnly) {
                    if (ast.contents[i].style === 'tag') {
                        defs.push(ast.contents[i])
                    }
                } else {
                    if (ast.contents[i].style === 'default') {
                        defs.push(ast.contents[i])
                    }
                }
            }
        }
        return {
            kind: 'Dictionary',
            entries: defs,
            line: this.currentNode.line,
            lineEnd: this.currentNode.line
        }
    },

    visitEach: function(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            this.visit(nodes[i])
        }
    },

    visit: function(node) {
        this.currentNode = node
        var i, kind
        switch (node.kind) {
            case 'Extend':
                var newAST = this.fileToAst(node.file.value)
                var localDefs = this.astToDictionaryNode(this.ast).entries
                this.ast = newAST
                this.ast.contents = localDefs.concat(this.ast.contents)
                break
            case 'Import':
                var ast
                if (node.style === 'file') {
                    ast = this.fileToAst(node.path.value)
                    this.ast.topLevelDefinitions[node.alias.value] = true
                    this.addFront.push({
                        kind: 'Definition',
                        name: {
                            kind: 'Identifier',
                            value: node.alias.value,
                            modifiers: [],
                            line: node.line,
                            lineEnd: node.lineEnd
                        },
                        parameters: [],
                        body: this.astToDictionaryNode(ast)
                    })
                } else if (node.style === 'directory') {
                    ast = this.directoryToListNode(node.path.value)
                    this.ast.topLevelDefinitions[node.alias.value] = true
                    this.addFront.push({
                        kind: 'Definition',
                        name: {
                            kind: 'Identifier',
                            value: node.alias.value,
                            modifiers: [],
                            line: node.line,
                            lineEnd: node.lineEnd
                        },
                        parameters: [],
                        body: ast
                    })
                } else if (node.style === 'tags') {
                    ast = this.fileToAst(node.path.value)
                    ast = this.astToDictionaryNode(ast, true)
                    this.addFront = this.addFront.concat(ast.entries)
                }
                break
            case 'Include':
                if (node.included.kind === 'Path') {
                    var ast = this.fileToAst(node.included.value)
                    var localDefs = node.context ? node.context.entries : []
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
                    node.context = node.context
                }
                break
            case 'For':
                this.visit(node.body)
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
            case 'List':
                this.visitEach(node.elements)
                break
            case 'ListElement':
                this.visit(node.value)
                break
            case 'Block':
                this.visitEach(node.contents)
                break
            case 'Definition':
                this.visitEach(node.body)
                break
            case 'Dictionary':
                this.visitEach(node.entries)
                break
            case 'Tag':
                this.visit(node.inner)
                break
            case 'Attribute':
            case 'Boolean':
            case 'Comment':
            case 'Doctype':
            case 'Filter':
            case 'FilterSequence':
            case 'Identifier':
            case 'Interpolation':
            case 'Mode':
            case 'Modifier':
            case 'Number':
            case 'Path':
            case 'Raw':
            case 'String':
                break
            default:
                this.error('No case for node of kind ' + node.kind)
        }
    },

    link: function() {
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
}

module.exports.link = function(ast, options) {
    return (new Linker(ast, options)).link()
}