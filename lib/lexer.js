/*
-----------------------------------------------------------------------------
OMELET LEXER

Transforms an input string into a list of tokens.

Code inspired by the Pug lexer:
https://github.com/pugjs/pug-lexer/
-----------------------------------------------------------------------------
*/

function buildError(name, message, line, src, file) {
    var fullMessage

    var lines = src.split('\n')
    var start = Math.max(line - 3, 0)
    var end = Math.min(lines.length, line + 3)
    var context = lines.slice(start, end).map(function(text, i){
        var curr = i + start + 1
        var preamble = (curr == line ? '  > ' : '    ')
                        + curr
                        + '| '
        var out = preamble + text
        return out
    }).join('\n')

    fullMessage = name + ' on line ' + line + ' of ' + (file || 'input') + ':\n\n' +
                    context + '\n\n' +
                    message

    var err = new Error(fullMessage)
    err.msg = message
    err.line = line
    err.file = file
    err.src = src
    return err
}

function Lexer(input) {
    this.original = input
    this.inputStr = input.replace(/\r\n/g, '\n')
    this.input = this.inputStr.split('')
    this.line = 1
    this.index = 0
    this.tokens = []
    this.c = this.input[this.index]
    this.len = this.input.length

    this.first10 = this.inputStr.substr(0, 10)

    this.indentLevel = 0
    this.indentStk = []

    this.ended = false

    this.filterSequenceStk = []
    this.allowNoPipe = false
    this.noNewLinesInFilterSequence = false
    this.inInterpolation = false
}

Lexer.prototype.inputStartsWith = function(str) {
    return this.first10.lastIndexOf(str, 0) === 0
}

Lexer.prototype.isDigit = function(chr) {
    switch(chr) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return true
        default:
            return false
    }
}

Lexer.prototype.isLetter = function(chr) {
    switch(chr) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
            return true
        default:
            return false
    }
}

Lexer.prototype.isPathCharacter = function(chr) {
    switch(chr) {
        case '/':
        case '.':
        case '_':
        case '-':
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            return true
        default:
            return false
    }
}

Lexer.prototype.isValidIdPart = function(chr) {
    switch(chr) {
        case '_':
        case '-':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
            return true
        default:
            return false
    }
}

Lexer.prototype.isValidTagNamePart = function(chr) {
    switch(chr) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
        case 'h':
        case 'i':
        case 'j':
        case 'k':
        case 'l':
        case 'm':
        case 'n':
        case 'o':
        case 'p':
        case 'q':
        case 'r':
        case 's':
        case 't':
        case 'u':
        case 'v':
        case 'w':
        case 'x':
        case 'y':
        case 'z':
        case 'A':
        case 'B':
        case 'C':
        case 'D':
        case 'E':
        case 'F':
        case 'G':
        case 'H':
        case 'I':
        case 'J':
        case 'K':
        case 'L':
        case 'M':
        case 'N':
        case 'O':
        case 'P':
        case 'Q':
        case 'R':
        case 'S':
        case 'T':
        case 'U':
        case 'V':
        case 'W':
        case 'X':
        case 'Y':
        case 'Z':
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '_':
        case ':':
            return true
        default:
            return false
    }
}

Lexer.prototype.isUnquotedAttrChar = function(chr) {
    switch (chr) {
        case ' ':
        case ']':
        case '"':
        case '\'':
        case '`':
        case '\t':
        case '\n':
        case '=':
        case '>':
        case '<':
            return false
        default:
            return true
    }
}

Lexer.prototype.error = function(message, line) {
    var err = buildError(
        'Lexer error',
        message,
        (line || this.line),
        this.original
    )
    throw err
}

Lexer.prototype.consume = function(len) {
    this.index += len
    this.c = this.input[this.index]
    this.first10 = this.inputStr.substr(this.index, 10)
}

Lexer.prototype.token = function(val, kind) {
    this.tokens.push({
        kind: kind,
        value: val,
        line: this.line,
    })
}

Lexer.prototype.lastToken = function() {
    return this.tokens[this.tokens.length - 1]
}

Lexer.prototype.eos = function() {
    if (this.index < this.len) {
        return
    }
    this.ended = true
    return true
}

Lexer.prototype.indent = function() {
    if (this.c === '\n') {
        var i = this.index + 1,
            d = this.input[i]
        while (i < this.len && (d === ' ' || d === '\t')) {
            i++
            d = this.input[i]
        }
        if (d === '\n') {
            // blank line, so consume and ignore it
            this.line++
            this.consume(i - this.index)
            return true
        }
        var len = i - this.index - 1
        var curr = this.indentLevel
        if (len > curr) {
            this.token(null, 'indent')
            this.indentStk.push(len)
            this.indentLevel = len
        } else if (len < curr) {
            this.token(null, 'dedent')
            this.indentStk.pop()
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
}

Lexer.prototype.doctype = function() {
    var x = this.index
    if (this.inputStartsWith('@doctype ')) {
        var i = this.index + 8,
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
        this.consume(this.index + 8 + val.length)
        return true
    }
}

Lexer.prototype.tag = function() {
    if ((this.c === '@' || (this.c === '|' && this.multiTagAllowed)) &&
        this.isLetter(this.input[this.index + 1])) {
        var i = this.index + 1,
            d = this.input[i]
            val = ''
        while (i < this.len && this.isValidTagNamePart(d)) {
            val += d
            i++
            d = this.input[i]
        }
        this.consume(val.length + 1)
        this.token(val, 'tag')
        while (this.specialAttr()) {}

        if (this.c === '[') {
            this.token(null, 'begin-attributes')
            var line = this.line
            this.consume(1)
            while(this.whitespace() || this.attr()) {}
            if (this.c !== ']') {
                this.error('Extra tokens found in attributes started on line ' + line +
                            '. Maybe you\'re missing a closing bracket \']\'?')
            }
            this.consume(1)
            this.token(null, 'end-attributes')
        }

        this.multiTagAllowed = true
        this.tag()
        this.multiTagAllowed = false

        return true
    }
}

Lexer.prototype.attr = function() {
    if (this.isValidIdPart(this.c)) {
        var i = this.index,
            d = this.input[i],
            name = '',
            val
        while (i < this.len && this.isValidIdPart(d)) {
            name += d
            i++
            d = this.input[i]
        }
        if (name.length === 0) {
            this.error('Expected a valid attribute name.')
        }
        this.consume(name.length)
        this.token(name, 'attr-name')

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
                while (i < this.len && this.isUnquotedAttrChar(d)) {
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
}

Lexer.prototype.specialAttr = function() {
    if (this.c === '.' || this.c === '#') {
        var i = this.index + 1,
            d = this.input[i],
            val = '',
            isClass = this.c === '.'
        while (i < this.len && this.isValidIdPart(d)) {
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
            kind: 'attr-name',
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
}

Lexer.prototype.comment = function() {
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
        this.token(val, 'comment')
        return true
    }
}

Lexer.prototype.interpolation = function() {
    if (this.c === '{') {
        var lineStart = this.line
        this.consume(1)
        this.token('{', 'begin-interpolation')
        this.inInterpolation = true

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
}

Lexer.prototype.filter = function() {
    if (this.allowNoPipe == true || this.c === '|') {
        this.allowNoPipe = false

        if (this.filterSequenceStk.length === 0) {
            this.filterSequenceStk.push(true)
            this.token('(', 'begin-filter-sequence')
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
}

Lexer.prototype.filterSequence = function() {
    if (this.c === '(') {

        this.filterSequenceStk.push(true)
        this.token('(', 'begin-filter-sequence')
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
        this.token(')', 'end-filter-sequence')

        return true
    }
}

Lexer.prototype.argument = function() {
    return this.number()
        || this.bool()
        || this.quotedString()
        || this.identifier()
}

Lexer.prototype.number = function() {
    var negative = this.c === '-'
    if (this.isDigit(this.c) ||
        (negative && this.isDigit(this.index + 1))) {
        var val = '',
            i = this.index,
            d,
            isFloat = false
        if (negative) {
            val = '-'
            i++
        }
        d = this.input[i]
        while (i < this.len && this.isDigit(d)) {
            val += d
            i++
            d = this.input[i]
        }
        if (d === '.') {
            val += '.'
            isFloat = true
            d = this.input[i]
            while (i < this.len && this.isDigit(d)) {
                val += d
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
}

Lexer.prototype.bool = function() {
    if (this.inputStartsWith('true')) {
        if (!this.isValidIdPart(this.input[this.index + 4])) {
            this.consume(4)
            this.token(true, 'boolean')
            return true
        }
    } else if (this.inputStartsWith('false')) {
        if (!this.isValidIdPart(this.input[this.index + 5])) {
            this.consume(5)
            this.token(false, 'boolean')
            return true
        }
    }
}

Lexer.prototype.quotedString = function() {
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
        this.consume(val.length + 2)
        this.token(val, 'string')
        return true
    }
}

Lexer.prototype.whitespace = function() {
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
}

Lexer.prototype.spaces = function() {
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
}

Lexer.prototype.identifier = function() {
    if (this.isLetter(this.c)) {
        var i = this.index,
            c = this.input[i],
            val = ''
        while (i < this.len && this.isValidIdPart(c)) {
            val += c
            i++
            c = this.input[i]
        }

        this.consume(val.length)
        this.token(val, 'identifier')

        while (this.modifier()) {}

        return true
    }
}

Lexer.prototype.modifier = function() {
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
}

Lexer.prototype.definition = function() {
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

        this.quotedString() || this.bool() || this.number()

        return true
    }
}

Lexer.prototype.mode = function() {
    if (this.c === ':') {
        var i = this.index + 1,
            d = this.input[i],
            val = ''
        while (i < this.len && this.isValidIdPart(d)) {
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
}

Lexer.prototype.plainTextLine = function(indentLevel) {
    if (this.c === '\n') {
        var indentCount = 0,
            i = this.index + 1,
            d = this.input[i],
            val = ''

        while (i < this.len && (d === ' ' || d === '\t')) {
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
}

Lexer.prototype.for = function() {
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
        if (!(this.identifier() || this.path())) {
            this.error('Expected identifier or path after \'in\'.')
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
}

Lexer.prototype.if = function() {
    if (this.inputStartsWith('>if ')) {
        this.token(null, 'begin-if')
        this.consume(4)
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
}

Lexer.prototype.elif = function() {
    if (this.inputStartsWith('>elif ')) {
        this.token(null, 'begin-elif')
        this.consume(6)
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
}

Lexer.prototype.else = function() {
    if (this.inputStartsWith('>else')) {
        this.token(null, 'begin-else')
        this.consume(5)
        return true
    }
}

Lexer.prototype.extend = function() {
    if (this.inputStartsWith('>extend ')) {
        this.consume(8)
        this.token(null, 'extend')
        if (!this.path()) {
            this.error('Expected an unquoted file path after \'>extend\'.')
        }
        return true
    }
}

Lexer.prototype.import = function() {
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
    }
}

Lexer.prototype.include = function() {
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
}

Lexer.prototype.includeMacro = function() {
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
}

Lexer.prototype.path = function() {
    if (this.isPathCharacter(this.c)) {
        var i = this.index,
            c = this.input[i],
            val = ''
        while (i < this.len && this.isPathCharacter(c)) {
            val += c
            i++
            c = this.input[i]
        }

        this.consume(val.length)
        this.token(val, 'path')

        return true
    }
}

Lexer.prototype.text = function() {
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
}

Lexer.prototype.fail = function() {
    this.error('Unexpected token on line ' + this.line + ': ' +
                this.input[this.index])
}

Lexer.prototype.next = function() {
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
            || this.text()
            || this.fail()
    }
    this.ended = true
}

Lexer.prototype.lex = function() {
    while (!this.ended) {
        this.next()
    }
    while (this.indentStk.length > 0) {
        this.indentStk.pop()
        this.token(null, 'dedent')
    }
    return this.tokens
}

function lex(input) {
    try {
        return JSON.stringify((new Lexer(input)).lex(), null, 4)
    } catch (e) {
        return e.message
    }
}

var inp =   '+stylesheet path ='+
            '    @link[href={path} rel="stylesheet" type="text/css"]'+
            ''+
            '+script path ='+
            '    @script[src={path} type="text/javascript"]'+
            ''+
            '@html'+
            '    @head'+
            '        @title Introducing Omelet'+
            '        {stylesheet "https://fonts.googleapis.com/css?family=Montserrat:400,700"}'+
            '           '+
            '        {stylesheet "prism.css"}'+
            '    @body'+
            '        @div.top'+
            '        @img.logo[src="logo4.svg"]'+
            ''+
            '        @div.contents'

if (typeof module !== 'undefined' && module.exports) {
    module.exports = lex
    console.time('lexing 10000')
    for (var i = 0; i < 10000; i++) {
        lex(inp)
    }
    console.timeEnd('lexing 10000')
}