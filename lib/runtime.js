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
var UglifyJS = require('uglify-js')

function minify(fn) {
    return UglifyJS.minify(fn.toString(), {fromString: true}).code
}

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
    return !omelet$runtime.falsy(obj)
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
            var err = omelet$runtime.buildError(
                'Filter error',
                e.message || 'Could not apply filter \'' + filterName + '\'.',
                line,
                source,
                fileName)
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
            throw Error('Variable \'' + key + '\' is already defined in this scope.')
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
        for (var i = env.length - 1; i >= 0; i--) {
            for (var k in env[i]) {
                if (k === key) return env[i][key]
            }
        }
        throw Error('Variable \'' + key + '\' is not defined in this scope!')
    }
}

module.exports = {
    filters: filters,
    applyFilters: applyFilters,
    typeOf: typeOf,
    falsy: falsy,
    truthy: truthy,
    Scope: Scope,
    htmlEscape: htmlEscape,
    buildError: errors.buildError,
    min: {
        filters: (function() {
            var minifiedFilters = {}
            for (var name in filters) {
                minifiedFilters[name] = minify(filters[name])
            }
            return minifiedFilters
        })(),
        applyFilters: minify(applyFilters),
        typeOf: minify(typeOf),
        falsy: minify(falsy),
        truthy: minify(truthy),
        Scope: minify(Scope),
        htmlEscape: minify(htmlEscape),
        buildError: minify(errors.buildError)
    }
}