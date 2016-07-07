var omelet$runtime = require('./runtime.js')

//-----------------------------------------------------------------------------
// BOOLEAN FILTERS (return a boolean)
//-----------------------------------------------------------------------------

/*
 * eq: equality (deep & strict)
 * takes in any input, any other, returns a boolean
 */
function eq(input, other) {
    var t1 = omelet$runtime.typeOf(input),
        t2 = omelet$runtime.typeOf(other),
        i
    if (t1 !== t2) {
        return false
    }
    switch (t1) {
        case 'Array':
            if (input.length !== other.length) {
                return false
            }
            for (i = 0; i < input.length; i++) {
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
            for (i = 0; i < keys1.length; i++) {
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
        t2 = omelet$runtime.typeOf(other),
        i
    if (t1 !== t2) {
        return true
    }
    switch (t1) {
        case 'Array':
            if (input.length !== other.length) {
                return true
            }
            for (i = 0; i < input.length; i++) {
                if (neq(input[i], other[i])) {
                    return true
                }
            }
            return false
        case 'Object':
            var keys1 = Object.keys(input),
                keys2 = Object.keys(other)
            if (keys1.length !== keys2.length) {
                return true
            }
            for (i = 0; i < keys1.length; i++) {
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
    var type = omelet$runtime.typeOf(input)
    if (type === 'Number') {
        return input % 2 === 0
    }
    return false
}

/*
 * odd: returns true iff input is even
 */
function odd(input) {
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
    if (type === 'String') {
        return input.lastIndexOf(needle) === (input.length - needle.length)
    } else if (type === 'Array') {
        return input.lastIndexOf(needle) === (input.length - 1)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
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
 * replace_first: replace first instance of pattern with replacement
 * input that isn't a string is converted to a string first
 */
function replace_first(input, pattern, replacement) {
    input = '' + input
    var re = new RegExp(pattern)
    return input.replace(re, replacement)
}

/*
 * truncate: chop a string off after n characters, and append "..."
 * also replaces multiple consective whitespace characters with a single space
 * input that isn't a string is just converted to a string
 */
function truncate(input, n) {
    var type = omelet$runtime.typeOf(input)
    if (type === 'String') {
        var out = input.replace(/\s\s+/g, ' ').slice(0, n)
        if (n < input.length) {
            out += '...'
        }
        return out
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
    var type = omelet$runtime.typeOf(input)
    if (type === 'String') {
        var arr = input.split(/\s\s*/).slice(0, n)
        var out = arr.join(' ')
        if (n <= arr.length) {
            out += '...'
        }
        return out
    } else {
        return input + ''
    }
}

/*
 * join: concatenate all elements of an array into a string, separated by separator
 * input that isn't an array is treated as an array with one element
 */
function join(input, separator) {
    var type = omelet$runtime.typeOf(input)
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
 * inspired by: https://github.com/epeli/underscore.string
 */
function strip_tags(input) {
    return (input + '').replace(/<\/?[^>]+>/g, '')
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
    var type = omelet$runtime.typeOf(input)
    if (type === 'String' || type === 'Array') {
        return input.length
    }
    if (type === 'Object') {
        return Object.keys(input).length
    }
    return 1
}

/*
 * word_count: count the number of words in the input, delimited by whitespace
 * characters (splitting on other delimeters can be done with |split _|length)
 */
function word_count(input) {
    return (input + '').split(/\s\s*/).length
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
    var type = omelet$runtime.typeOf(input)
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
    var type = omelet$runtime.typeOf(input)
    if (type === 'Object') {
        return Object.keys(input)
    } else if (type === 'Array') {
        var arr = []
        for (var i = 0; i < input.length; i++) {
            arr.push(i)
        }
        return arr
    } else {
        return input
    }
}

function sort(input) {
    var type = omelet$runtime.typeOf(input)
    if (type !== 'Array') {
        return input
    }
    var arr = input.slice(0)
    arr.sort(function(a, b) {
        return a > b ? 1 : a < b ? -1 : 0
    })
    return arr
}

/*
 * sort_by: sort a List of Dictionaries by a given property
 */
function sort_by(input, prop) {
    var type = omelet$runtime.typeOf(input)
    if (type !== 'Array') {
        return input
    }
    function compareBy(a, b) {
        var dateA = new Date(a[prop])
        var dateB = new Date(b[prop])
        var valA, valB
        if (omelet$runtime.typeOf(dateA) === 'Date'
            && !isNaN(dateA.getTime()) &&
            omelet$runtime.typeOf(dateB) === 'Date'
            && !isNaN(dateB.getTime())) {
            valA = dateA
            valB = dateB
        } else {
            valA = a[prop]
            valB = b[prop]
        }
        return valA > valB ? 1 : valA < valB ? -1 : 0
    }
    var arr = input.slice(0)
    return arr.sort(compareBy)
}

function reverse(input) {
    var type = omelet$runtime.typeOf(input)
    if (type === 'Array') {
        var arr = input.slice(0)
        arr.reverse()
        return arr
    }
    if (type === 'String') {
        var arr = input.split('')
        arr.reverse()
        return arr.join('')
    }
    return input
}

//-----------------------------------------------------------------------------
// DICTIONARY FILTERS (return a dictionary)
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// DATE FILTERS (return a date)
//-----------------------------------------------------------------------------

function to_date(input) {
    var d = new Date(input)
    if (isNaN(d.valueOf())) {
        throw Error('Invalid input to \'to_date\' filter.' +
            ' Could not convert \'' + input.toString() + '\' to a Date object.')
    }
    return d
}

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
    var type = omelet$runtime.typeOf(input)
    if (type === 'String') {
        if (n > input.length || n < 0) {
            return ''
        }
        return input.charAt(n)
    }
    if (type === 'Array') {
        if (n > input.length || n < 0) {
            return ''
        }
        return input[n]
    }
    return ''
}

/*
 * get: get a value from a Dictionary, given a key
 * for simple access, you could just use object["key"] or object.key, but
 * this filter is helpful for things like {listOfObjects | map (get "key")}
 */
function get(input, key) {
    var type = omelet$runtime.typeOf(input)
    if (type === 'Object' || type === 'Array') {
        return input[key] || ''
    }
    return ''
}

function type_of(input) {
    var type = omelet$runtime.typeOf(input)
    switch (type) {
        case 'Array':
            return 'List'
        case 'Object':
            return 'Dictionary'
        default:
            return type
    }
}

//-----------------------------------------------------------------------------
// HIGHER-ORDER FILTERS (take in a filter sequence)
//-----------------------------------------------------------------------------

function map(input, seq) {
    var type = omelet$runtime.typeOf(input)
    if (type !== 'Array') {
        input = [input]
    }
    var output = []
    for (var i = 0; i < input.length; i++) {
        output.push(omelet$runtime.applyFilters(input[i], seq))
    }
    return output
}

function filter(input, seq) {
    var type = omelet$runtime.typeOf(input)
    if (type !== 'Array') {
        input = [input]
    }
    var output = []
    for (var i = 0; i < input.length; i++) {
        var res = omelet$runtime.applyFilters(input[i], seq)
        if (res === true) {
            output.push(input[i])
        }
    }
    return output
}


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
    replace_first: replace_first,
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
    reverse: reverse,
    to_date: to_date,
    default: default_value,
    nth: nth,
    type_of: type_of,
    get: get,
    map: map,
    for_each: map,
    filter: filter,
    keep_if: filter
}