/*
-----------------------------------------------------------------------------
OMELET PREPROCESSOR

Preprocesses input text before parsing. We strip all comments and insert
indent and dedent tokens, to allow for simpler parsing.
-----------------------------------------------------------------------------
*/

var DEDENT_TOKEN = '\u21d0'
var INDENT_TOKEN = '\u21d2'
var commentRegEx = new RegExp(/[ ]*\#\#.*$/)

function preprocessIndentation(text) {
    var lines = text.split('\n')
    var processedLines = insertTokens(lines, [])
    return processedLines.join('\n') + '\n'
}

function insertTokens(lines, stack) {
    if (lines.length === 0) {
        var out = []
        for (var i = 0; i < stack.length; i++) {
            out.push(DEDENT_TOKEN)
        }
        return out
    }

    var line = lines[0].replace(commentRegEx, '')
    var rest = lines.slice(1)

    if (line.length === 0) {
        return insertTokens(rest, stack)
        // return [line].concat(insertTokens(rest, stack))
    }

    var indentation = calculateIndentation(line)
    var top = stack.length ? stack[stack.length - 1] : 0

    if (indentation > top) {
        stack.push(indentation)
        return [INDENT_TOKEN, line].concat(insertTokens(rest, stack))
    }

    if (indentation === top) {
        return [line].concat(insertTokens(rest, stack))
    }

    if (indentation < top) {
        stack.pop()
        return [DEDENT_TOKEN].concat(insertTokens(lines, stack))
    }

}

function calculateIndentation(line) {
    var count = 0
    for (var i = 0; i < line.length; i++) {
        var c = line.charAt(i)
        if (c != ' ' && c != '\t') {
            break
        } else if (c == ' ') {
            count += 1
        } else if (c == '\t') {
            count += 4
        }
    }
    return count
}

module.exports.preprocess = preprocessIndentation