/*
-----------------------------------------------------------------------------
OMELET RUNTIME

Functions that compiled Omelet templates may need to reference when they
are rendered (at runtime, after compilation). For example, filters are
applied at runtime, so they are needed here.
-----------------------------------------------------------------------------
*/
var filters = require('./filters.js')

function minifyFn(fn) {
    return fn.toString().replace(/(;|{|})\s+/g, '$1')
                        .replace(/ (\+|===|=|<|\-|>=) /g, '$1')
}

function htmlEscape(str) {
    return ('' + str).replace(/[&><\"\']/g, function(chr) {
        switch (chr) {
            case '"': return '&quot;';
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '\'': return '&apos;';
        }
    });
}

function typeOf(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1];
}

function falsy(obj) {
    return (obj === false || obj === null ||
            obj === '' || typeof obj === 'undefined');
}

function truthy(obj) {
    return !falsy(obj);
}

function applyFilters(input, seq) {
    var output = input;
    var filterSeq = seq.slice();

    for (var i = 0; i < filterSeq.length; i++) {
        var filterName = filterSeq[i][0];
        var filterArgs = filterSeq[i][1];
        filterArgs.unshift(output);
        output = filters[filterName].apply(null, filterArgs);
        filterArgs.shift();
    }

    return output;
}

function Scope() {
    var env = [{}];

    this.open = function() {
        env.push({});
    };
    this.close = function() {
        env.pop();
    };
    this.add = function(key, value) {
        if (env[env.length - 1][key]) {
            throw Error('Variable \'' + key + '\' is already defined in this scope.');
        };
        env[env.length - 1][key] = value;
    };
    this.addAll = function(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            this.add(keys[i], obj[keys[i]]);
        }
    };
    this.find = function(key) {
        for (var i = env.length - 1; i >= 0; i--) {
            for (var k in env[i]) {
                if (k === key) return env[i][key];
            }
        }
        throw Error('Variable \'' + key + '\' is not defined in this scope!');
    };
}

module.exports = {
    filters: filters,
    applyFilters: applyFilters,
    typeOf: typeOf,
    falsy: falsy,
    truthy: truthy,
    Scope: Scope,
    htmlEscape: htmlEscape,
    min: {
        filters: filters,
        applyFilters: minifyFn(applyFilters),
        typeOf: minifyFn(typeOf),
        falsy: minifyFn(falsy),
        truthy: minifyFn(truthy),
        Scope: minifyFn(Scope),
        htmlEscape: minifyFn(htmlEscape)
    }
}