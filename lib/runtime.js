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

module.exports = {
    filters: filters,
    applyFilters: applyFilters,
    type: __.type
}