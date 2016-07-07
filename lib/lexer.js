/*
-----------------------------------------------------------------------------
OMELET LEXER

Transforms an input string into a list of tokens.

Code inspired by the Pug lexer:
https://github.com/pugjs/pug-lexer/
-----------------------------------------------------------------------------
*/

var __ = require('./util.js')
var errors = require('./errors.js')

function Lexer(input, options) {
    this.original = input
    this.input = this.original.split('')

    // options
    options = options || {}
    this.stripComments = options.stripComments || false
    this.fileName = options.fileName

    this.line = 1
    this.index = 0
    this.tokens = []
    this.c = this.input[this.index]
    this.len = this.input.length
    this.first14 = this.original.substr(0, 14)

    this.indentLevel = 0
    this.indentStk = []

    this.ended = false

    this.filterSequenceStk = []
    this.allowNoPipe = false
    this.noNewLinesInFilterSequence = false
    this.inInterpolation = false
    this.expectLineEndAfterValue = false

    this.definitionIndentLevel = -1
    this.definitionIndentStk = []
    this.inDefinition = false
}

Lexer.prototype = {

    constructor: Lexer,

    error: function(message, line) {
        var err = errors.buildError(
            'Lexer error',
            message,
            (line || this.line),
            this.original,
            this.fileName
        )
        throw err
    },

    consume: function(len) {
        this.index += len
        this.c = this.input[this.index]
        this.first14 = this.original.substr(this.index, 14)
    },

    token: function(val, kind) {
        this.tokens.push({
            kind: kind,
            value: val,
            line: this.line,
        })
    },

    lastToken: function() {
        return this.tokens[this.tokens.length - 1]
    },

    inputStartsWith: function(str) {
        return this.first14.lastIndexOf(str, 0) === 0
    },

    indent: function() {
        if (this.c === '\r') {
            this.consume(1)
        }
        if (this.c === '\n') {
            var i = this.index + 1,
                d = this.input[i]
            while (i < this.len && (d === ' ' || d === '\t')) {
                i++
                d = this.input[i]
            }
            if (d === '\n') {
                this.line++
                this.consume(i - this.index)
                return true
            }
            var len = i - this.index - 1
            var curr = this.indentLevel
            if (len > curr) {
                var last = this.lastToken()
                var oldIndent = this.indentLevel

                this.token(null, 'indent')
                this.indentStk.push(len)
                this.indentLevel = len

                if (last && last.kind === 'end-params') {
                    if (!this.inDefinition) {
                        this.inDefinition = true
                        this.definitionIndentLevel = oldIndent
                    }
                }
            } else if (len < curr) {
                if (len === this.definitionIndentLevel) {
                    this.inDefinition = false
                }

                while (this.indentStk[this.indentStk.length - 1] > len) {
                    this.token(null, 'dedent')
                    level = this.indentStk.pop()
                }

                this.indentLevel = len
            } else {
                this.token(null, 'newline')
            }
            this.line++
            this.consume(len + 1)
            return true
        } else if (this.index === 0 && (this.c === ' ' || this.c === '\t')) {
            this.error('The first line of a document may not be indented.')
        }
    },

    doctype: function() {
        var x = this.index
        if (this.inputStartsWith('@doctype ')) {
            var i = this.index + 9,
                d = this.input[i],
                val = ''
            while (i < this.len && d !== '\n') {
                val += d
                i++
                d = this.input[i]
            }
            if (val === '') {
                return
            }
            this.token(val.trim(), 'doctype')
            this.consume(9 + val.length)
            return true
        }
    },

    tag: function() {
        if ((this.c === '@' || (this.c === '|' && this.multiTagAllowed)) &&
            __.isLetter(this.input[this.index + 1])) {
            var i = this.index + 1,
                d = this.input[i]
                val = ''
            while (i < this.len && __.isValidTagNamePart(d)) {
                val += d
                i++
                d = this.input[i]
            }
            this.consume(val.length + 1)
            this.token(val, 'tag')
            while (this.specialAttr()) {}

            if (this.c === '[') {
                var line = this.line
                this.consume(1)
                while(this.whitespace() || this.attr()) {}
                if (this.c !== ']') {
                    this.error('Extra tokens found in attributes started on line ' + line +
                                '. Maybe you\'re missing a closing bracket \']\'?')
                }
                this.consume(1)
            }

            // Skip a single space character after a tag header
            //   @h1 hello, world! --> <h1>hello, world!</h1>
            if (this.c === ' ') {
                this.consume(1)
            }

            this.multiTagAllowed = true
            this.tag()
            this.multiTagAllowed = false

            return true
        }
    },

    attr: function() {
        if (__.isValidIdPart(this.c)) {
            var i = this.index,
                d = this.input[i],
                name = '',
                val
            while (i < this.len && __.isValidIdPart(d)) {
                name += d
                i++
                d = this.input[i]
            }

            this.consume(name.length)
            this.token(name, 'attribute-name')

            this.spaces()
            if (this.c === '=') {
                this.consume(1)
                this.spaces()
                if (this.quotedString()) {}
                else if (this.interpolation()) {}
                else {
                    i = this.index
                    d = this.input[i]
                    val = ''
                    while (i < this.len && __.isUnquotedAttrChar(d)) {
                        val += d
                        i++
                        d = this.input[i]
                    }
                    if (this.index === i) {
                        this.error('Expected an attribute value after \'=\'.')
                    }
                    this.consume(i - this.index)
                    this.token(val, 'string')
                }
            } else {
                this.lastToken().isBooleanAttr = true
            }
            return true
        }
    },

    specialAttr: function() {
        if (this.c === '.' || this.c === '#') {
            var i = this.index + 1,
                d = this.input[i],
                val = '',
                isClass = this.c === '.'
            while (i < this.len && __.isValidIdPart(d)) {
                val += d
                i++
                d = this.input[i]
            }
            if (i === this.index + 1) {
                this.error('Expected ' + (isClass ? 'class' : 'id') +
                            ' name following \'' + this.c + '\' in tag header.')
            }
            this.consume(val.length + 1)
            this.tokens.push({
                kind: 'attribute-name',
                value: isClass ? 'class' : 'id',
                line: this.line
            })
            this.tokens.push({
                kind: 'string',
                value: val,
                line: this.line
            })
            return true
        }
    },

    comment: function() {
        if (this.inputStartsWith('##')) {
            var i = this.index + 2,
                d = this.input[i],
                val = ''
            while (i < this.len && d !== '\n') {
                val += d
                i++
                d = this.input[i]
            }
            this.consume(val.length + 2)
            if (!this.stripComments) {
                this.token(val, 'comment')
            }
            return true
        }
    },

    interpolation: function() {
        if (this.c === '{') {
            var lineStart = this.line
            this.consume(1)
            this.token('{', 'begin-interpolation')
            this.inInterpolation = true

            if (this.c === '~') {
                this.lastToken().noEscape = true
                this.consume(1)
            }

            this.whitespace()
            if (this.tag()) {
                while (this.interpolation()
                    || this.text()
                    || this.whitespace()) {}
            } else {
                if (!this.identifier()) {
                    this.error('You\'re missing a variable name in this interpolation.')
                }

                while (this.whitespace() || this.argument()) {}

                while (this.filter()) {}

                while (this.filterSequenceStk.length > 0) {
                    this.filterSequenceStk.pop()
                    this.token(')', 'end-filter-sequence')
                }
            }
            if (this.c !== '}') {
                this.error('Could not lex interpolation starting on line ' + lineStart + '. ' +
                            'Did you forget a closing brace \'}\'?')
            }

            this.token('}', 'end-interpolation')
            this.consume(1)
            this.inInterpolation = false
            return true
        }
    },

    filter: function() {
        if (this.allowNoPipe == true || this.c === '|') {
            this.allowNoPipe = false

            if (this.filterSequenceStk.length === 0) {
                this.filterSequenceStk.push(true)
                this.token(null, 'begin-filter-sequence')
            }

            if (this.c === '|') {
                this.consume(1)
            }

            this.inFilter = true
            this.token(null, 'begin-filter')

            if (this.noNewLinesInFilterSequence) {
                this.spaces()
            } else {
                this.whitespace()
            }
            if (!this.identifier()) {
                this.error('Expected name of filter after \'|\' on line ' + this.line)
            }
            if (this.noNewLinesInFilterSequence) {
                while (this.spaces() || this.filterSequence() || this.argument()) {}
            } else {
                while (this.whitespace() || this.filterSequence() || this.argument()) {}
            }
            this.token(null, 'end-filter')
            this.inFilter = false

            return true
        }
    },

    filterSequence: function() {
        if (this.c === '(') {

            this.filterSequenceStk.push(true)
            this.token(null, 'begin-filter-sequence')
            this.allowNoPipe = true

            this.consume(1)

            if (this.noNewLinesInFilterSequence) {
                while (this.spaces() || this.filter()) {}
            } else {
                while (this.whitespace() || this.filter()) {}
            }

            if (this.c !== ')') {
                this.error('Missing closing parenthesis ) at end of filter sequence on line ' + this.line)
            }
            this.consume(1)
            this.filterSequenceStk.pop()
            this.token(null, 'end-filter-sequence')

            return true
        }
    },

    argument: function() {
        return this.number()
            || this.bool()
            || this.quotedString()
            || this.identifier()
    },

    number: function() {
        var negative = this.c === '-'
        if (__.isDigit(this.c) || (negative &&
                                   __.isDigit(this.input[this.index + 1]))) {
            var val = '',
                i = this.index,
                d,
                isFloat = false
            if (negative) {
                val = '-'
                i++
            }
            d = this.input[i]
            while (i < this.len && __.isDigit(d)) {
                val += d
                i++
                d = this.input[i]
            }
            if (d === '.') {
                val += '.'
                i++
                isFloat = true
                d = this.input[i]
                while (i < this.len && __.isDigit(d)) {
                    val += d
                    i++
                    d = this.input[i]
                }
            }
            if (this.expectLineEndAfterValue) {
                while (i < this.len && d !== '\n') {
                    if (d !== ' ') {
                        return
                    }
                    i++
                    d = this.input[i]
                }
            }
            this.consume(val.length)
            if (isFloat) {
                val = parseFloat(val)
            } else {
                val = parseInt(val)
            }
            this.token(val, 'number')
            return true
        }
    },

    bool: function() {
        if (this.inputStartsWith('true')) {
            if (!__.isValidIdPart(this.input[this.index + 4])) {
                if (this.expectLineEndAfterValue) {
                    var i = this.index + 4,
                        d = this.input[i]
                    while (i < this.len && d !== '\n') {
                        if (d !== ' ') {
                            return
                        }
                        i++
                        d = this.input[i]
                    }
                }
                this.consume(4)
                this.token(true, 'boolean')
                return true
            }
        } else if (this.inputStartsWith('false')) {
            if (!__.isValidIdPart(this.input[this.index + 5])) {
                if (this.expectLineEndAfterValue) {
                    var i = this.index + 5,
                        d = this.input[i]
                    while (i < this.len && d !== '\n') {
                        if (d !== ' ') {
                            return
                        }
                        i++
                        d = this.input[i]
                    }
                }
                this.consume(5)
                this.token(false, 'boolean')
                return true
            }
        }
    },

    quotedString: function() {
        if (this.c === '"' || this.c === '\'') {
            var i = this.index + 1,
                d = this.input[i]
                val = ''
            while (i < this.len && d !== this.c) {
                if (d === '\n') {
                    this.error('Line breaks are not allowed inside quoted strings.')
                }
                val += d
                i++
                d = this.input[i]
                if (i >= this.len) {
                    this.error('Missing ending quote ' + this.c + ' for quoted string.')
                }
            }
            i++
            d = this.input[i]
            var s = 0
            if (this.expectLineEndAfterValue) {
                while (i < this.len && d !== '\n') {
                    if (d !== ' ') {
                        return
                    }
                    s++
                    i++
                    d = this.input[i]
                }
            }
            this.consume(val.length + 2 + s)
            this.token(val, 'string')
            return true
        }
    },

    whitespace: function() {
        if (this.c === ' ' || this.c === '\n') {
            var i = this.index,
                d = this.input[i]
            while (i < this.len && (d === ' ' || d === '\n')) {
                if (d === '\n') {
                    this.line++
                }
                i++
                d = this.input[i]
            }
            this.consume(i - this.index)
            return true
        }
    },

    spaces: function() {
        if (this.c === ' ') {
            var i = this.index,
                d = this.input[i]
            while (i < this.len && d === ' ') {
                i++
                d = this.input[i]
            }
            this.consume(i - this.index)
            return true
        }
    },

    identifier: function() {
        if (__.isLetter(this.c)) {
            var i = this.index,
                c = this.input[i],
                val = ''
            while (i < this.len && __.isValidIdPart(c)) {
                val += c
                i++
                c = this.input[i]
            }

            this.consume(val.length)
            this.token(val, 'identifier')

            while (this.modifier()) {}

            return true
        }
    },

    modifier: function() {
        var id = this.lastToken().value
        if (this.c === '.') {
            this.consume(1)
            this.token('.', 'dot')

            if (!this.identifier()) {
                this.error('Expected an identifier after \'' + id + '.\'.')
            }
            return true
        } else if (this.c === '[') {
            this.consume(1)
            this.token('[', 'lbracket')

            if (this.quotedString() || this.number() || this.identifier()) {
            } else {
                this.error('Invalid modifier for identifier \'' + id + '\'. Modifiers between [ ] braces must be a quoted string, a number, or an identifier.')
            }

            if (this.c !== ']') {
                this.error('Could not lex modifier for identifier \'' + id + '\'. Maybe you\'re missing a closing brace \']\'?')
            }
            this.consume(1)
            this.token(']', 'rbracket')
            return true
        }
    },

    definition: function() {
        if (this.c === '+') {
            this.consume(1)
            this.token(null, 'begin-definition')
            this.spaces()
            if (!this.identifier()) {
                this.error('Expected identifier after \'+\' in definition.')
            }
            this.token(null, 'begin-params')
            while (this.spaces() || this.identifier()) {}
            this.token(null, 'end-params')
            if (this.c !== '=') {
                this.error('Expected \'=\' in definition.')
            }
            this.consume(1)
            this.spaces()

            this.expectLineEndAfterValue = true
            this.quotedString() || this.bool() || this.number()
            this.expectLineEndAfterValue = false

            return true
        }
    },

    listItem: function() {
        if (this.inDefinition && this.c === '-') {

            this.consume(1)
            this.token(null, 'begin-list-item')
            this.spaces()

            this.quotedString() || this.bool() || this.number()

            return true
        }
    },

    mode: function() {
        if (this.c === ':') {
            var i = this.index + 1,
                d = this.input[i],
                val = ''
            while (i < this.len && __.isValidIdPart(d)) {
                val += d
                i++
                d = this.input[i]
            }
            if (val.length === 0) {
                return
            }
            while (i < this.len && (d === ' ' || d === '\t')) {
                i++
                d = this.input[i]
            }
            if (d !== '\n') {
                return
            }
            this.consume(i - this.index)
            this.token(val, 'mode')
            this.line++

            // After a mode statement (e.g. :raw), we collect
            // everything in the indented block following it
            // as plain text
            var modeIndentLevel = 0
            i++
            d = this.input[i]
            while (i < this.len && (d === ' ' || d === '\t')) {
                modeIndentLevel++
                i++
                d = this.input[i]
            }
            // now we know that each line of the mode block
            // has indent level of modeIndentLevel
            while (this.plainTextLine(modeIndentLevel)) {
                this.line++
            }
            this.line--

            return true
        }
    },

    plainTextLine: function(indentLevel) {
        if (this.c === '\n') {
            var indentCount = 0,
                i = this.index + 1,
                d = this.input[i],
                val = ''

            while (i < this.len && (d === ' ' || d === '\t') && indentCount < indentLevel) {
                indentCount++
                i++
                d = this.input[i]
            }
            if (indentCount < indentLevel || indentCount === 0) {
                return
            }
            while (i < this.len && d !== '\n') {
                val += d
                i++
                d = this.input[i]
            }

            this.consume(indentCount + val.length + 1)
            this.token(val, 'raw')
            return true
        }
    },

    for: function() {
        if (this.inputStartsWith('>for ')) {
            this.token(null, 'begin-for')
            this.consume(5)
            if (!this.identifier()) {
                this.error('Expected identifier after \'>for\'.')
            }
            this.spaces()
            if (!this.inputStartsWith('in ')) {
                var lastIdent = this.lastToken().value
                this.error('Expected \'in\' in for loop, after \'>for ' + lastIdent + '\'.')
            }
            this.consume(3)
            if (!(this.identifier())) {
                this.error('Expected identifier after \'in\'.')
            }
            this.spaces()
            this.noNewLinesInFilterSequence = true
            while (this.filter()) {}

            while (this.filterSequenceStk.length > 0) {
                this.filterSequenceStk.pop()
                this.token(null, 'end-filter-sequence')
            }
            this.noNewLinesInFilterSequence = false
            return true
        }
    },

    if: function() {
        if (this.inputStartsWith('>if ')) {
            this.token(null, 'begin-if')
            this.consume(4)

            this.spaces()
            if (this.inputStartsWith('not ')) {
                this.token(null, 'not')
                this.consume(4)
            }

            if (!this.identifier()) {
                this.error('Expected identifier after \'>if\'.')
            }
            this.spaces()
            this.noNewLinesInFilterSequence = true
            while (this.filter()) {}

            while (this.filterSequenceStk.length > 0) {
                this.filterSequenceStk.pop()
                this.token(')', 'end-filter-sequence')
            }
            this.noNewLinesInFilterSequence = false

            return true
        }
    },

    elif: function() {
        if (this.inputStartsWith('>elif ')) {
            this.token(null, 'begin-elif')
            this.consume(6)

            this.spaces()
            if (this.inputStartsWith('not ')) {
                this.token(null, 'not')
                this.consume(4)
            }

            if (!this.identifier()) {
                this.error('Expected identifier after \'>elif\'.')
            }
            this.spaces()
            this.noNewLinesInFilterSequence = true
            while (this.filter()) {}

            while (this.filterSequenceStk.length > 0) {
                this.filterSequenceStk.pop()
                this.token(')', 'end-filter-sequence')
            }
            this.noNewLinesInFilterSequence = false

            while(this.elif()) {}

            return true
        }
    },

    else: function() {
        if (this.inputStartsWith('>else')) {
            this.token(null, 'begin-else')
            this.consume(5)
            return true
        }
    },

    extend: function() {
        if (this.inputStartsWith('>extend ')) {
            this.consume(8)
            this.token(null, 'extend')
            if (!this.path()) {
                this.error('Expected an unquoted file path after \'>extend\'.')
            }
            return true
        }
    },

    import: function() {
        if (this.inputStartsWith('>import ')) {
            var path
            this.consume(8)
            this.token(null, 'import')
            if (!(path = this.path())) {
                this.error('Expected an unquoted file path after \'>import\'.')
            }
            this.spaces()
            if (!this.inputStartsWith('as ')) {
                var lastIdent = this.lastToken().value
                this.error('Expected \'as\' in import statement, after \'>import ' + path + '\'.')
            }
            this.consume(3)
            this.spaces()
            if (!this.identifier()) {
                this.error('Expected an alias name after \'as\' in import statement.')
            }
            return true
        } else if (this.inputStartsWith('>import-dir ')) {
            var path
            this.consume(12)
            this.token(null, 'import-dir')
            if (!(path = this.path())) {
                this.error('Expected an unquoted directory path after \'>import-dir\'.')
            }
            this.spaces()
            if (!this.inputStartsWith('as ')) {
                var lastIdent = this.lastToken().value
                this.error('Expected \'as\' in import-dir statement, after \'>import-dir ' + path + '\'.')
            }
            this.consume(3)
            this.spaces()
            if (!this.identifier()) {
                this.error('Expected an alias name after \'as\' in import-dir statement.')
            }
            return true
        } else if (this.inputStartsWith('>import-tags ')) {
            var path
            this.consume(13)
            this.token(null, 'import-tags')
            if (!this.inputStartsWith('from ')) {
                this.error('Expected \'from\' in import-tags statement, after \'>import-tags\'')
            }
            this.consume(5)
            if (!(path = this.path())) {
                this.error('Expected an unquoted file path after \'>import-tags from\'.')
            }
            return true
        }
    },

    include: function() {
        if (this.inputStartsWith('>include ')) {
            var path
            this.consume(9)
            this.token(null, 'include')
            if (!(path = this.path())) {
                this.error('Expected an unquoted file path after \'>include\'.')
            }
            this.spaces()
            if (this.inputStartsWith('with')) {
                this.consume(4)
                this.token(null, 'with')
            }
            return true
        }
    },

    includeMacro: function() {
        if (this.c === '>') {
            var id
            this.consume(1)
            this.token(null, 'include')
            if (!(id = this.identifier())) {
                this.error('Expected an identifier (or a keyword) after \'>\' character.')
            }
            this.spaces()
            if (this.inputStartsWith('with')) {
                this.consume(4)
                this.token(null, 'with')
            }
            return true
        }
    },

    path: function() {
        if (__.isPathCharacter(this.c)) {
            var i = this.index,
                c = this.input[i],
                val = ''
            while (i < this.len && __.isPathCharacter(c)) {
                val += c
                i++
                c = this.input[i]
            }

            this.consume(val.length)
            this.token(val, 'path')

            return true
        }
    },

    text: function() {
        var i = this.index,
            d = this.input[i],
            t = '',
            escaped = 0

        if (d === '{' || (this.inInterpolation && d === '}')) return

        var skip
        while (i < this.len && d !== '\n') {
            skip = false

            if (d === '#') {
                if (this.input[i + 1] === '#') {
                    this.consume(t.length + escaped)
                    this.token(t, 'text')
                    return true
                }
            } else if (d === '\\') {
                var e = this.input[i + 1]
                if (e === '{' || (this.inInterpolation && e === '}') || e === '\\') {
                    i++
                    escaped++
                    d = this.input[i]
                } else {
                    escaped++
                    skip = true
                }
            } else if (d === '{' || (this.inInterpolation && d === '}')) {
                this.consume(t.length + escaped)
                this.token(t, 'text')
                return true
            }
            if (!skip) {
                t += d
            }
            i++
            d = this.input[i]
        }
        if (t.length > 0) {
            this.consume(t.length + escaped)
            this.token(t, 'text')
            return true
        }
    },

    fail: function() {
        this.error('Unexpected token on line ' + this.line + ': ' +
                    this.input[this.index])
    },

    next: function() {
        if (this.index < this.len) {
            return this.indent()
                || this.doctype()
                || this.tag()
                || this.comment()
                || this.interpolation()
                || this.definition()
                || this.mode()
                || this.for()
                || this.if()
                || this.elif()
                || this.else()
                || this.include()
                || this.import()
                || this.extend()
                || this.includeMacro()
                || this.listItem()
                || this.text()
                || this.fail()
        }
        this.ended = true
    },

    lex: function() {
        while (!this.ended) {
            this.next()
        }
        while (this.indentStk.length > 0) {
            this.indentStk.pop()
            this.token(null, 'dedent')
        }
        return this.tokens
    }
}

module.exports.lex = function(input, options) {
    return (new Lexer(input, options)).lex()
}