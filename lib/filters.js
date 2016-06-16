var __ = require('./util.js')
var assert = require('assert')
var striptags = require('striptags')

var filters = {}

//-----------------------------------------------------------------------------
// BOOLEAN FILTERS (return a boolean)
//-----------------------------------------------------------------------------

/*
 * eq: equality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
filters.eq = function(input, other) {
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
filters.neq = function(input, other) {
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
filters.gt = function(input, other) {
    return input > other
}

/*
 * lt: less than
 * returns true if input < other, false otherwise
 */
filters.lt = function(input, other) {

    console.log(input+" < "+JSON.stringify(other)+"? ", input < other)
    return input < other
}

/*
 * lte: less than or equals
 * returns true if input <= other, false otherwise
 */
filters.lte = function(input, other) {
    return input <= other
}

/*
 * gte: greater than or equals
 * returns true if input >= other, false otherwise
 */
filters.gte = function(input, other) {
    return input >= other
}

/*
 * starts_with: if input is string, true iff the string starts with needle
 * if input is array, true iff the first element is needle
 * if input is another type, always false
 */
filters.starts_with = function(input, needle) {
    if (__.isString(input) || __.isArray(input)) {
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
filters.ends_with = function(input, needle) {
    if (__.isString(input) || __.isArray(input)) {
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
filters.contains = function(input, other) {
    if (__.isArray(input) || __.isString(input)) {
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
filters.uppercase = function(input) {
    console.log("uppercasing: "+input)
    console.log(__.typeOf(input))
    if (__.isString(input)) {
        return input.toUpperCase()
    } else {
        return input + ''
    }
}

/*
 * lowercase: convert a string to all lowercase
 * input that isn't a string is just converted to a string
 */
filters.lowercase = function(input) {
    if (__.isString(input)) {
        return input.toLowerCase()
    } else {
        return input + ''
    }
}

/*
 * trim: remove all whitespace characters from both ends of a string
 * input that isn't a string is just converted to a string
 */
filters.trim = function(input) {
    if (__.isString(input)) {
        return input.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
    } else {
        return input + ''
    }
}

/*
 * ltrim: remove all whitespace characters from the left side of a string
 * input that isn't a string is just converted to a string
 */
filters.ltrim = function(input) {
    if (__.isString(input)) {
        return input.replace(/^\s\s*/, '')
    } else {
        return input + ''
    }
}

/*
 * rtrim: remove all whitespace characters from the right side of a string
 * input that isn't a string is just converted to a string
 */
filters.rtrim = function(input) {
    if (__.isString(input)) {
        return input.replace(/\s\s*$/, '')
    } else {
        return input + ''
    }
}

/*
 * replace: replace all instances of pattern with replacement in a string
 * input that isn't a string is converted to a string first
 */
filters.replace = function(input, pattern, replacement) {
    input = '' + input
    var re = new RegExp(pattern, 'g')
    return input.replace(re, replacement)
}

/*
 * truncate: chop a string off after n characters, and append "..."
 * also replaces multiple consective whitespace characters with a single space
 * input that isn't a string is just converted to a string
 */
filters.truncate = function(input, n) {
    if (__.isString(input)) {
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
filters.truncate_words = function(input, n) {
    if (__.isString(input)) {
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
filters.join = function(input, separator) {
    if (!__.isArray(input)) {
        input = [input]
    }
    return input.join(separator)
}

/*
 * append: append str to the end of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
filters.append = function(input, str) {
    return '' + input + str
}

/*
 * prepend: prepend str to the beginning of a string, returning the new string
 * input that isn't a string is coerced to a string by JavaScript
 */
filters.prepend = function(input, str) {
    return '' + str + input
}

/*
 * strip_tags: strip all HTML tags from input
 * input coerced to string before stripping tags
 * uses this npm module: https://www.npmjs.com/package/striptags
 */
filters.strip_tags = function(input) {
    return striptags(input + '')
}

/*
 * escape: escape invalid HTML characters and return HTML-safe string
 */
filters.escape = function(input) {
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
filters.length = filters.size = function(input) {
    var type = __.typeOf(input, true)
    if (type === 'String' || type === 'Array') {
        console.log("length of "+input+" is "+input.length)
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
filters.word_count = function(input) {
    return input.split(" ").length;
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
filters.split = function(input, separator) {
    if (__.isString(input)) {
        return input.split(separator)
    } else {
        return [input]
    }
}

filters.keys = function(input) {
    var type = __.typeOf(input, true)
    if (type === "Object") {
        return Object.keys(input)
    } else if (type === "Array") {
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
filters.default = function(input, defaultValue) {
    return (input === '' || typeof input === 'undefined' ||
            input === null) ? defaultValue : input
}

/*
 * nth: get the nth element of a string or array
 * if not a string or array, return ''
 */
filters.nth = function(input, n) {
    var type = __.typeOf(input, true)
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

filters.map = function(input, filterSequence) {
    if (!filterSequence.__isFilterSequence) {
        throw Error('Invalid argument given to \'map\'.')
    }

    var type = __.typeOf(input, true)
    if (type === 'String') {
        input = input.split('')
    } else if (type !== 'Array') {
        input = [input]
    }

    var output = []
    for (var i = 0; i < input.length; i++) {
        output.push(applySequence(input[i], filterSequence))
    }

    return output
}

filters.filter = function(input, filterSequence) {
    if (!filterSequence.__isFilterSequence) {
        throw Error('Invalid argument given to \'filter\'.')
    }

    var type = __.typeOf(input, true)
    if (type === 'String') {
        input = input.split('')
    } else if (type !== 'Array') {
        input = [input]
    }

    var output = []
    for (var i = 0; i < input.length; i++) {
        if (applySequence(input[i], filterSequence) === true) {
            output.push(input[i])
        }
    }

    return output
}

//-----------------------------------------------------------------------------
// APPLICATION FUNCTIONS
//-----------------------------------------------------------------------------

function applySequence(input, fltrs) {
    var output = input
    for (var i = 0; i < fltrs.sequence.length; i++) {
        output = applyFilter(output, fltrs.sequence[i].name, fltrs.sequence[i].args)
    }
    return output
}

function applyFilter(input, filterName, filterArguments) {
    if (filters[filterName] === undefined) {
        throw Error('Cannot apply unrecognized filter \'' + filterName + '\'.')
    }
    var filterArgs = filterArguments.slice()
    filterArgs.unshift(input)
    console.log("args... "+JSON.stringify(filterArgs))
    console.log("input... "+JSON.stringify(input))
    var output = filters[filterName].apply(null, filterArgs)
    console.log("applying filter "+filterName+" to "+input+"\n   got: "+output)
    return output
}


// /*
//  * Apply a filter to input string, with possible arguments.
//  * Return error if the filter is undefined.
//  */
// function applyFilter(input, filterNode, filterArguments) {
//     var filterName = filterNode.name.value
//     console.log("applyFilter")
//     console.log(input)
//     console.log(filterName)
//     if (filters[filterName] === undefined) {
//         throw FilterError('Cannot apply undefined filter \'' + filterName + '\'.')
//     }
//     var filterArgs = filterArguments.slice()
//     console.log(filterArgs)
//     // filterArgs = input === undefined ? [undefined] : filterArgs
//     var output = filters[filterName].apply(filterNode, filterArgs)
//     return output
// }

// /*
//  * Takes in an input string and a FilterSequence node
//  */
// function applySequence(input, filterSequence) {
//     var filters = filterSequence.filters
//     var output = input

//     for (i = 0; i < filters.length; i++) {
//         var filterName = filters[i].name.value
//         output = applyFilter(output, filters[i], filters[i].arguments)
//     }
//     return output
// }

filters._applySequence = applySequence;
module.exports = filters