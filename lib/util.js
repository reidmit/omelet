var util = {}

/*
* A function to merge attributes that have the same name.
*   param: attrList (list of AST Attribute nodes)
*   param: attrName (string name of attribute to merge)
*/
util.mergeAttributes = function(attrList) {
    if (attrList.length < 2) {
        return attrList
    }
    var attMap = {},
        i = 0,
        newAttrList = []

    for (; i < attrList.length; i++) {
        var name = attrList[i].name.value
        if (attMap[name] && name === 'class') {
            attMap[name].value.value += ' ' + attrList[i].value.value
        } else {
            attMap[name] = attrList[i]
        }
    }

    var keys = Object.keys(attMap)
    for (i = 0; i < keys.length; i++) {
        newAttrList.push(attMap[keys[i]])
    }
    return newAttrList
}

util.ltrim = function(string) {
    return string.replace(/^[ \t\n]*/, '')
}

util.typeOf = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1]
}

util.isNumber = function(o) { return util.typeOf(o) === 'Number' }
util.isString = function(o) { return util.typeOf(o) === 'String' }
util.isBoolean = function(o) { return util.typeOf(o) === 'Boolean' }
util.isArguments = function(o) { return util.typeOf(o) === 'Arguments' }
util.isDate = function(o) { return util.typeOf(o) === 'Date' }
util.isArray = function(o) { return util.typeOf(o) === 'Array' }
util.isObject = function(o) { return util.typeOf(o) === 'Object' }

util.printAST = function(ast) {
    var printed = JSON.stringify(ast, null, 4)
    console.log(printed)
    return printed
}

util.doctype = function(str) {
    function wrap(middle) {
        return '<!DOCTYPE ' + middle + '>'
    }
    str = str.toLowerCase()
    switch (str) {
        case 'html5':
        case 'html':
        case '5':
            return '<!doctype html>'
        case '4.01':
        case 'transitional':
            return wrap('HTML PUBLIC \'-//W3C//DTD HTML 4.01 Transitional //EN\' \'http://www.w3.org/TR/html4/loose.dtd\'')
        case 'frameset':
            return wrap('HTML PUBLIC \'-//W3C//DTD HTML 4.01 Frameset //EN\' \'http://www.w3.org/TR/html4/frameset.dtd\'')
        case 'xhtml_1.0':
        case 'xhtml_1.0_strict':
        case 'xhtml_strict':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Strict //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\'')
        case 'xhtml_1.0_transitional':
        case 'xhtml_transitional':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Transitional //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\'')
        case 'xhtml_1.0_frameset':
        case 'xhtml_frameset':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Frameset //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\'')
        case 'xhtml_1.1':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.1//EN\' \'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\'')
        default:
            return '<!doctype ' + str + '>'
    }
}


util.isDigit = function(chr) {
    switch (chr) {
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

util.isLetter = function(chr) {
    switch (chr) {
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

util.isPathCharacter = function(chr) {
    switch (chr) {
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

util.isValidIdPart = function(chr) {
    switch (chr) {
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

util.isValidTagNamePart = function(chr) {
    switch (chr) {
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

util.isUnquotedAttrChar = function(chr) {
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

// found here: https://github.com/joliss/js-string-escape
util.jsEscape = function(str) {
    return ('' + str).replace(/["'\\\n\r\u2028\u2029]/g, function(chr) {
        switch (chr) {
            case '"':
            case '\'':
            case '\\':
                return '\\' + chr
            case '\n':
                return '\\n'
            case '\r':
                return '\\r'
            case '\u2028':
                return '\\u2028'
            case '\u2029':
                return '\\u2029'
        }
    })
}

module.exports = util
