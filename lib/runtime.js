/*
-----------------------------------------------------------------------------
OMELET RUNTIME

Functions that compiled Omelet templates may need to reference when they
are rendered (at runtime, after compilation). For example, filters are
applied at runtime, so they are needed here.
-----------------------------------------------------------------------------
*/
var errors = require('./errors.js')
var filters = require('./filters.js')

function htmlEscape(str) {
    return ('' + str).replace(/[&><\"\']/g, function(chr) {
        switch (chr) {
            case '"': return '&quot;'
            case '&': return '&amp;'
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '\'': return '&apos;'
        }
    })
}

function typeOf(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1]
}

function falsy(obj) {
    return (obj === false || obj === null ||
            obj === '' || typeof obj === 'undefined')
}

function truthy(obj) {
    return (obj !== false && obj !== null &&
            obj !== '' && typeof obj !== 'undefined')
}

function applyFilters(input, seq, fileName, source, line) {
    var output = input
    var filterSeq = seq.slice()

    for (var i = 0; i < filterSeq.length; i++) {
        var filterName = filterSeq[i][0]
        var filterArgs = filterSeq[i][1]
        filterArgs.unshift(output)
        try {
            output = filters[filterName].apply(null, filterArgs)
        } catch (e) {
            var err = runtime.buildError(
                'Filter error',
                e.message || 'Could not apply filter \'' + filterName + '\'.',
                line, source, fileName)
            throw err
        }
        filterArgs.shift()
    }

    return output
}

function Scope() {
    var env = [{}]

    this.open = function() {
        env.push({})
    }
    this.close = function() {
        env.pop()
    }
    this.add = function(key, value) {
        if (env[env.length - 1][key]) {
            throw runtime.buildError(
                'Runtime error',
                'Variable \'' + key + '\' is already defined in this scope.',
                0, '', '')
        }
        env[env.length - 1][key] = value
    }
    this.addAll = function(obj) {
        var keys = Object.keys(obj)
        for (var i = 0; i < keys.length; i++) {
            this.add(keys[i], obj[keys[i]])
        }
    }
    this.find = function(key) {
        var modifiers = Array.prototype.slice.call(arguments, 1)
        for (var i = env.length - 1; i >= 0; i--) {
            for (var k in env[i]) {
                if (k === key) {
                    if (modifiers.length === 0) {
                        return env[i][key]
                    }
                    var val = env[i][key]
                    for (var j = 0; j < modifiers.length; j++) {
                        var newVal = val[modifiers[j]]
                        // if (typeof newVal === 'undefined') {
                        //     throw runtime.buildError(
                        //         'Runtime error',
                        //         'Could not access undefined property \'' + modifiers[j] + '\' of object.',
                        //         0, '', '')
                        // }
                        val = newVal
                    }
                    return val
                }
            }
        }
        throw runtime.buildError(
            'Runtime error',
            'Variable \'' + key + '\' is not defined or not in scope.',
            0, '', '')
    }
}

var runtime = {
    filters: filters,
    applyFilters: applyFilters,
    typeOf: typeOf,
    falsy: falsy,
    truthy: truthy,
    Scope: Scope,
    htmlEscape: htmlEscape,
    buildError: errors.buildError
}

module.exports = runtime
