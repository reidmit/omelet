var __ = require('./util.js')

module.exports.EvalError = function(state, input) {
    var startIndex, endIndex, message,
        prefix, suffix, lookahead, lookbehind,
        lines, line, column

    lookahead = lookbehind = 30
    startIndex = state.index - lookbehind
    endIndex = state.index + lookahead
    startIndex = startIndex > 0 ? startIndex : 0
    endIndex = endIndex < input.length ? endIndex : input.length
    prefix = startIndex === 0 ? '' : '...'
    suffix = endIndex === input.length ? '' : '...'

    lines = input.split('\n')
    column = state.index
    for (var i = 0; i < lines.length; i++) {
        if (column - lines[i].length > 0) {
            column -= lines[i].length
        } else {
            line = i
            break
        }
    }

    message = state.msg + '\n' +
                '\nAt line ' + line + ', column ' + column + ' in input:\n' +
                '    ' + prefix + input.substring(startIndex, endIndex) + suffix + '\n' +
                '    ' + __.repeat(' ', (prefix.length ? prefix.length + lookbehind : state.index)) + '^'

    return 'EvalError: ' + message
}


/*
err is of the form:
    {   message: ... (e.g. 'Expected x or y, but z found.')
        expected: ...
        found: ...
        location: { start: { offset: ..., line: ..., column: ...},
                      end: { offset: ..., line: ..., column: ...}}
    }
*/
module.exports.ParseError = function(filePath, err) {
    var expected

    //remove duplicated '//' in paths
    filePath = filePath.replace(/\/\//g, '/')

    //get list of expected values in quotes, separated by 'or'
    err.expected = err.expected || []
    console.log(err)
    expected = err.expected.map(function(v) { return v.description }).join(' or ')

    return 'Parser Error: Could not parse file \'' + filePath + '\'\n' +
           '    At line ' + err.location.start.line + ', column ' + err.location.start.column + '\n' +
           '    Expected ' + expected + ', but found \'' + err.found + '\''
}

module.exports.SyntaxError = function(properties) {
    var startIndex, endIndex, message, prefix, suffix, lookahead, lookbehind

    lookahead = lookbehind = 20
    startIndex = properties.index - lookbehind
    endIndex = properties.index + lookahead
    startIndex = startIndex > 0 ? startIndex : 0
    endIndex = endIndex < properties.input.length ? endIndex : properties.input.length
    prefix = startIndex === 0 ? '' : '...'
    suffix = endIndex === properties.input.length ? '' : '...'

    message = properties.message + '\n' +
                '    ' + prefix + properties.input.substring(startIndex, endIndex) + suffix + '\n' +
                '    ' + __.repeat(' ', (prefix.length ? prefix.length + lookbehind : properties.index)) + '^'

    return console.error('SyntaxError:', message)
}

module.exports.AssertionError = function(properties) {
    return console.error('Assertion Failed:', properties.message)
}
