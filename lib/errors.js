/*
-----------------------------------------------------------------------------
OMELET ERROR MESSAGES

Functions used by the lexer/parser/compiler to build helpful error messages
when things go wrong. Much of the initial buildError code was borrowed from
Pug's: https://github.com/pugjs/pug-error
-----------------------------------------------------------------------------
*/

var __ = require('./util.js')

function buildError(name, message, line, src, file) {
    var fullMessage

    var lines = src.split('\n')
    var start = line - 3 > 0 ? line - 3 : 0
    var end = lines.length > line + 3 ? lines.length : line + 3
    var context = lines.slice(start, end).map(function(text, i){
        var curr = i + start + 1
        var preamble = (curr === line
                            ? '  > ' + curr + '| '
                            : '    ' + curr + '| ')
        var out = preamble + text
        return out
    }).join('\n')

    fullMessage = name + ' on line ' + line + ' of ' + (file || 'input') + '.\n\n' +
                    context + '\n\n' +
                    message + '\n'

    var err = new Error(fullMessage)
    err.name = 'OmeletError'
    err.msg = message
    err.line = line
    err.file = file
    err.src = src
    err.stack = ''
    return err
}

module.exports = {
    buildError: buildError
}