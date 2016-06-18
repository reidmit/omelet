var __ = require('./util.js')
var assert = require('assert')
var striptags = require('striptags')
var runtime = require('./runtime.js')

var filters = {}

function typeOf(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1]
}

//-----------------------------------------------------------------------------
// BOOLEAN FILTERS (return a boolean)
//-----------------------------------------------------------------------------

/*
 * eq: equality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
module.exports.eq = function(input, other) {
    try {
        assert.deepStrictEqual(input, other)
        return true
    } catch (e) {
        return false
    }
}

/*
 * neq: inequality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
module.exports.neq = function(input, other) {
    try {
        assert.deepStrictEqual(input, other)
        return false
    } catch (e) {
        return true
    }
}

/*
 * gt: greater than
 * returns true if input > other, false otherwise
 */
module.exports.gt = function(input, other) {
    return input > other
}

/*
 * lt: less than
 * returns true if input < other, false otherwise
 */
module.exports.lt = function(input, other) {
    return input < other
}

/*
 * lte: less than or equals
 * returns true if input <= other, false otherwise
 */
module.exports.lte = function(input, other) {
    return input <= other
}

/*
 * gte: greater than or equals
 * returns true if input >= other, false otherwise
 */
module.exports.gte = function(input, other) {
    return input >= other
}

/*
 * even: is even?
 * returns true if input is even
 */
module.exports.even = function(input) {
    var type = typeOf(input)
    if (type === 'Number') {
        return input % 2 === 0
    }
    return false
}

/*
 * odd: is odd?
 * returns true if input is even
 */
module.exports.odd = function(input) {
    var type = typeOf(input)
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
module.exports.starts_with = function(input, needle) {
    var type = typeOf(input)
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
module.exports.ends_with = function(input, needle) {
    var type = typeOf(input)
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
module.exports.contains = function(input, other) {
    var type = typeOf(input)
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
module.exports.uppercase = function(input) {
    var type = typeOf(input)
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
module.exports.lowercase = function(input) {
    var type = typeOf(input)
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
module.exports.trim = function(input) {
    var type = typeOf(input)
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
module.exports.ltrim = function(input) {
    var type = typeOf(input)
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
module.exports.rtrim = function(input) {
    var type = typeOf(input)
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
module.exports.replace = function(input, pattern, replacement) {
    input = '' + input
    var re = new RegExp(pattern, 'g')
    return input.replace(re, replacement)
}

/*
 * truncate: chop a string off after n characters, and append "..."
 * also replaces multiple consective whitespace characters with a single space
 * input that isn't a string is just converted to a string
 */
module.exports.truncate = function(input, n) {
    var type = typeOf(input)
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
module.exports.truncate_words = function(input, n) {
    var type = typeOf(input)
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
module.exports.join = function(input, separator) {
    var type = typeOf(input)
    if (type !== 'Array') {
        input = [input]
    }
    return input.join(separator)
}

/*
 * append: append str to the end of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
module.exports.append = function(input, str) {
    return '' + input + str
}

/*
 * prepend: prepend str to the beginning of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
module.exports.prepend = function(input, str) {
    return '' + str + input
}

/*
 * strip_tags: strip all HTML tags from input
 * input coerced to string before stripping tags
 * uses this npm module: https://www.npmjs.com/package/striptags
 */
module.exports.strip_tags = function(input) {
    return striptags(input + '')
}

/*
 * escape: escape invalid HTML characters and return HTML-safe string
 */
module.exports.escape = function(input) {
    return input.replace(/\'/g, '&apos;')
                .replace(/\"/g, '&quot;')
                .replace(/\&/g, '&amp;')
                .replace(/\</g, '&lt;')
                .replace(/\>/g, '&gt;')
}

//-----------------------------------------------------------------------------
// NUMBER FILTERS (return a number)
//-----------------------------------------------------------------------------

/*
 * length/size: if input is a string, return the number of characters
 * if input is an array, return the number of elements
 * if input is a dictionary, return the number of keys
 */
module.exports.length = module.exports.size = function(input) {
    var type = typeOf(input)
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
module.exports.word_count = function(input) {
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
module.exports.split = function(input, separator) {
    var type = typeOf(input)
    if (type === 'String') {
        return input.split(separator)
    } else {
        return [input]
    }
}

module.exports.keys = function(input) {
    var type = typeOf(input)
    if (type === 'Object') {
        return Object.keys(input)
    } else if (type === 'Array') {
        return __.range(0, input.length - 1)
    } else {
        return input
    }
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
module.exports.default = function(input, defaultValue) {
    return (input === '' || typeof input === 'undefined' ||
            input === null) ? defaultValue : input
}

/*
 * nth: get the nth element of a string or array
 * if not a string or array, return ''
 */
module.exports.nth = function(input, n) {
    var type = typeOf(input)
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

module.exports.map = module.exports.for_each = function(input, seq) {
    var type = typeOf(input)
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

module.exports.filter = module.exports.keep_if = function(input, seq) {
    var type = typeOf(input)
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
