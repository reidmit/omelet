var __ = require('./util.js')
var assert = require('assert')
var striptags = require('striptags')
var runtime = require('./runtime.js')

module.exports = {
    eq: eq,
    neq: neq,
    gt: gt,
    lt: lt,
    gte: gte,
    lte: lte,
    even: even,
    odd: odd,
    starts_with: starts_with,
    ends_with: ends_with,
    contains: contains,
    uppercase: uppercase,
    lowercase: lowercase,
    trim: trim,
    ltrim: ltrim,
    rtrim: rtrim,
    replace: replace,
    truncate: truncate,
    truncate_words: truncate_words,
    join: join,
    append: append,
    prepend: prepend,
    strip_tags: strip_tags,
    escape: escape,
    length: length,
    size: length,
    word_count: word_count,
    split: split,
    keys: keys,
    sort: sort,
    sort_by: sort_by,
    default: default_value,
    nth: nth,
    map: map,
    for_each: map,
    filter: filter,
    keep_if: filter
}

//-----------------------------------------------------------------------------
// BOOLEAN FILTERS (return a boolean)
//-----------------------------------------------------------------------------

/*
 * eq: equality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
function eq(input, other) {
    var t1 = omelet$runtime.typeOf(input),
        t2 = omelet$runtime.typeOf(other)
    if (t1 !== t2) {
        return false
    }
    switch (t1) {
        case 'Array':
            if (input.length !== other.length) {
                return false
            }
            for (var i = 0; i < input.length; i++) {
                if (!eq(input[i], other[i])) {
                    return false
                }
            }
            return true
        case 'Object':
            var keys1 = Object.keys(input),
                keys2 = Object.keys(other)
            if (keys1.length !== keys2.length) {
                return false
            }
            for (var i = 0; i < keys1.length; i++) {
                if (!eq(input[keys1[i]], other[keys1[i]])) {
                    return false
                }
            }
            return true
        case 'Date':
            return input.valueOf() === other.valueOf()
        default:
            return input === other
    }
}

/*
 * neq: inequality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
function neq(input, other) {
    var t1 = omelet$runtime.typeOf(input),
        t2 = omelet$runtime.typeOf(other)
    if (t1 !== t2) {
        return true
    }
    switch (t1) {
        case 'Array':
            if (input.length !== other.length) {
                return true
            }
            for (var i = 0; i < input.length; i++) {
                if (!neq(input[i], other[i])) {
                    return false
                }
            }
            return true
        case 'Object':
            var keys1 = Object.keys(input),
                keys2 = Object.keys(other)
            if (keys1.length !== keys2.length) {
                return true
            }
            for (var i = 0; i < keys1.length; i++) {
                if (!neq(input[keys1[i]], other[keys1[i]])) {
                    return false
                }
            }
            return true
        case 'Date':
            return input.valueOf() !== other.valueOf()
        default:
            return input !== other
    }
}

/*
 * gt: greater than
 * returns true if input > other, false otherwise
 */
function gt(input, other) {
    return input > other
}

/*
 * lt: less than
 * returns true if input < other, false otherwise
 */
function lt(input, other) {
    return input < other
}

/*
 * lte: less than or equals
 * returns true if input <= other, false otherwise
 */
function lte(input, other) {
    return input <= other
}

/*
 * gte: greater than or equals
 * returns true if input >= other, false otherwise
 */
function gte(input, other) {
    return input >= other
}

/*
 * even: returns true iff input is even
 */
function even(input) {
    var type = runtime.type(input)
    if (type === 'Number') {
        return input % 2 === 0
    }
    return false
}

/*
 * odd: returns true iff input is even
 */
function odd(input) {
    var type = runtime.type(input)
    if (type === 'Number') {
        return input % 2 !== 0
    }
    return false
}

/*
 * starts_with: if input is string, true iff the string starts with needle
 * if input is array, true iff the first element is needle
 * if input is another type, always false
 */
function starts_with(input, needle) {
    var type = runtime.type(input)
    if (type === 'String' || type === 'Array') {
        return input.indexOf(needle) === 0
    } else {
        return false
    }
}

/*
 * ends_with: if input is string, true iff the string ends with needle
 * if input is array, true iff the last element is needle
 * if input is another type, always false
 */
function ends_with(input, needle) {
    var type = runtime.type(input)
    if (type === 'String' || type === 'Array') {
        return input.indexOf(needle) === (input.length - needle.length)
    } else {
        return false
    }
}

/*
 * contains: if input is string, true iff the string contains other
 * if input is array, true iff one element === other
 * if input is another type, always false
 */
function contains(input, other) {
    var type = runtime.type(input)
    if (type === 'String' || type === 'Array') {
        return input.indexOf(other) !== -1
    }
    return false
}

//-----------------------------------------------------------------------------
// STRING FILTERS (return a string)
//-----------------------------------------------------------------------------

/*
 * uppercase: convert a string to all uppercase
 * input that isn't a string is just converted to a string
 */
function uppercase(input) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.toUpperCase()
    } else {
        return input + ''
    }
}

/*
 * lowercase: convert a string to all lowercase
 * input that isn't a string is just converted to a string
 */
function lowercase(input) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.toLowerCase()
    } else {
        return input + ''
    }
}

/*
 * trim: remove all whitespace characters from both ends of a string
 * input that isn't a string is just converted to a string
 */
function trim(input) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
    } else {
        return input + ''
    }
}

/*
 * ltrim: remove all whitespace characters from the left side of a string
 * input that isn't a string is just converted to a string
 */
function ltrim(input) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.replace(/^\s\s*/, '')
    } else {
        return input + ''
    }
}

/*
 * rtrim: remove all whitespace characters from the right side of a string
 * input that isn't a string is just converted to a string
 */
function rtrim(input) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.replace(/\s\s*$/, '')
    } else {
        return input + ''
    }
}

/*
 * replace: replace all instances of pattern with replacement in a string
 * input that isn't a string is converted to a string first
 */
function replace(input, pattern, replacement) {
    input = '' + input
    var re = new RegExp(pattern, 'g')
    return input.replace(re, replacement)
}

/*
 * truncate: chop a string off after n characters, and append "..."
 * also replaces multiple consective whitespace characters with a single space
 * input that isn't a string is just converted to a string
 */
function truncate(input, n) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.replace(/\s\s+/g, ' ').slice(0, n) + '...'
    } else {
        return input + ''
    }
}

/*
 * truncate_words: chop a string off after n words, and append "..."
 * also replaces multiple consective whitespace characters with a single space
 * input that isn't a string is just converted to a string
 */
function truncate_words(input, n) {
    var type = runtime.type(input)
    if (type === 'String') {
        var arr = input.replace(/\s\s+/g, ' ').split(' ')
        if (n >= arr.length) {
            return arr.join(' ')
        }
        arr.splice(n)
        return arr.join(' ') + '...'
    } else {
        return input + ''
    }
}

/*
 * join: concatenate all elements of an array into a string, separated by separator
 * input that isn't an array is treated as an array with one element
 */
function join(input, separator) {
    var type = runtime.type(input)
    if (type !== 'Array') {
        input = [input]
    }
    return input.join(separator)
}

/*
 * append: append str to the end of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
function append(input, str) {
    return '' + input + str
}

/*
 * prepend: prepend str to the beginning of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
function prepend(input, str) {
    return '' + str + input
}

/*
 * strip_tags: strip all HTML tags from input
 * input coerced to string before stripping tags
 * uses this npm module: https://www.npmjs.com/package/striptags
 */
function strip_tags(input) {
    return striptags(input + '')
}

/*
 * escape: escape invalid HTML characters and return HTML-safe string
 */
function escape(input) {
    return input.replace(/\&/g, '&amp;')
                .replace(/\</g, '&lt;')
                .replace(/\>/g, '&gt;')
}

//-----------------------------------------------------------------------------
// NUMBER FILTERS (return a number)
//-----------------------------------------------------------------------------

/*
 * length (alias: size): if input is a string, return the number of characters
 * if input is an array, return the number of elements
 * if input is a dictionary, return the number of keys
 */
function length(input) {
    var type = runtime.type(input)
    if (type === 'String' || type === 'Array') {
        return input.length
    }
    if (type === 'Object') {
        return Object.keys(input).length
    }
    return 1
}

/*
 * word_count: count the number of words in the input, delimited by
 * spaces (splitting on other delimeters can be done with |split|length)
 */
function word_count(input) {
    return input.split(' ').length
}

//-----------------------------------------------------------------------------
// ARRAY FILTERS (return an array)
//-----------------------------------------------------------------------------

/*
 * split: break a string into an array of substrings at each occurrence
 * of separator
 * input that isn't a string is turned into an array with input as its
 * only element
 */
function split(input, separator) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.split(separator)
    } else {
        return [input]
    }
}

/*
 * keys: get the keys of a Dictionary or Array as an Array
 */
function keys(input) {
    var type = runtime.type(input)
    if (type === 'Object') {
        return Object.keys(input)
    } else if (type === 'Array') {
        return __.range(0, input.length - 1)
    } else {
        return input
    }
}

function sort(input) {
    return input.sort()
}

/*
 * sort_by: sort an Array of Dictionaries by a given property
 */
function sort_by(input, prop) {
    function compareBy(a, b) {
        var dateA = new Date(a)
        var dateB = new Date(b)
        var valA, valB
        if (typeOf(dateA) === 'Date' && !isNaN(dateA.getTime()) &&
            typeOf(dateB) === 'Date' && !isNaN(dateB.getTime())) {
            valA = dateA
            valB = dateB
        } else {
            valA = a[prop]
            valB = b[prop]
        }
        if (valA < valB) {
            return 1
        }
        if (valA > valB) {
            return -1
        }
        return 0
    }
    return input.sort(compareBy)
}

//-----------------------------------------------------------------------------
// DICTIONARY FILTERS (return a dictionary)
//-----------------------------------------------------------------------------



//-----------------------------------------------------------------------------
// OTHER FILTERS (return value depends on parameters)
//-----------------------------------------------------------------------------

/*
 * default: if input is empty ("" or undefined or null), return
 * defaultValue, otherwise return input
 */
function default_value(input, defaultValue) {
    return (input === '' || typeof input === 'undefined' ||
            input === null) ? defaultValue : input
}

/*
 * nth: get the nth element of a string or array
 * if not a string or array, return ''
 */
function nth(input, n) {
    var type = runtime.type(input)
    if (type === 'String') {
        return input.charAt(n)
    }
    if (type === 'Array') {
        return input[n]
    }
    return ''
}

//-----------------------------------------------------------------------------
// HIGHER-ORDER FILTERS (take in a filter sequence)
//-----------------------------------------------------------------------------

function map(input, seq) {
    var type = runtime.type(input)
    if (type === 'String') {
        input = input.split('')
    } else if (type !== 'Array') {
        input = [input]
    }
    var output = []
    for (var i = 0; i < input.length; i++) {
        output.push(runtime.applyFilters(input[i], seq))
    }
    return output
}

function filter(input, seq) {
    var type = runtime.type(input)
    if (type === 'String') {
        input = input.split('')
    } else if (type !== 'Array') {
        input = [input]
    }
    var output = []
    for (var i = 0; i < input.length; i++) {
        var res = runtime.applyFilters(input[i], seq)
        if (res === true) {
            output.push(input[i])
        }
    }
    return output
}