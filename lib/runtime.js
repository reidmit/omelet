/*
-----------------------------------------------------------------------------
OMELET RUNTIME

Functions that compiled Omelet templates may need to reference when they
are rendered (at runtime, after compilation). For example, filters are
applied at runtime, so they are needed here.
-----------------------------------------------------------------------------
*/
var __ = require('./util.js')
var filters = require('./filters.js')

function type(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1]
}

function falsy(obj) {
    return (obj === false || obj === null ||
            obj === '' || typeof obj === 'undefined')
}

function truthy(obj) {
    return !falsy(obj)
}

function applyFilters(input, filterSeq) {
    var output = input

    for (var i = 0; i < filterSeq.length; i++) {
        var filterName = filterSeq[i][0]
        var filterArgs = filterSeq[i][1]
        filterArgs.unshift(output)
        output = filters[filterName].apply(null, filterArgs)
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
                if (k == key) {
                    return env[i][key]
                }
            }
        }
        return
    }
    this.data = function() { return env }
    this.state = function() { return '\n' + JSON.stringify(env, null, 4) }
}

module.exports = {
    filters: filters,
    applyFilters: applyFilters,
    type: type,
    falsy: falsy,
    truthy: truthy,
    Scope: Scope
}