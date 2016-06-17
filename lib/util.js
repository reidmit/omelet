var util = {}

/*
* A function to merge attributes that have the same name.
*   param: attrList (list of AST Attribute nodes)
*   param: attrName (string name of attribute to merge)
*/
util.mergeAttributes = function(attrList, attrName) {
    if (attrList.length < 2) {
        return attrList
    }

    var toMerge = []
    var indices = []
    var i

    for (i = 0; i < attrList.length; i++) {
        if (attrList[i].name.value === attrName) {
            toMerge.push(attrList[i])
            indices.push(i)
        }
    }

    if (toMerge.length === 0) {
        return attrList
    }

    var newAttrVal = ''
    for (i = 0; i < toMerge.length; i++) {
        newAttrVal += toMerge[i].value.value + ' '
    }
    newAttrVal = newAttrVal.trim()
    toMerge[0].value.value = newAttrVal

    for (i = 1; i < toMerge.length; i++) {
        attrList.splice(indices[i], 1)
    }

    return attrList
}

util.ltrim = function(string) {
    return string.replace(/^[ \t\n]*/, '')
}

util.typeOf = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1]
}

util.isNumber = function(o) { return util.typeOf(o) === 'Number' }
util.isString = function(o) { return util.typeOf(o) === 'String' }
util.isBoolean = function(o) { return util.typeOf(o) === 'Boolean' }
util.isArguments = function(o) { return util.typeOf(o) === 'Arguments' }
util.isDate = function(o) { return util.typeOf(o) === 'Date' }
util.isArray = function(o) { return util.typeOf(o) === 'Array' }
util.isObject = function(o) { return util.typeOf(o) === 'Object' }

util.repeat = function(s, n) {
    var out = ''
    while (n > 0) {
        out += s
        n--
    }
    return out
}

util.contains = function(array, item) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item) {
            return true
        }
    }
    return false
}

util.toMap = function(commaSeparatedItems) {
    var o = {}
    var items = commaSeparatedItems.split(',')
    items.forEach(function(item) {
        o[item] = true
    })
    return o
}

util.printAST = function(ast) {
    var printed = JSON.stringify(ast, null, 4)
    console.log(printed)
    return printed
}

util.range = function(min, max) {
    if (typeof max === 'undefined') {
        max = min
        min = 0
    }
    var r = []
    if (min > max) {
        for (var i = max; i >= min; i--) {
            r.push(i)
        }
    } else {
        for (var i = min; i <= max; i++) {
            r.push(i)
        }
    }
    return r
}

util.doctype = function(str) {
    function wrap(middle) {
        return '<!DOCTYPE ' + middle + '>'
    }
    str = str.toLowerCase()
    switch (str) {
        case 'html5':
        case 'html':
        case '5':
            return '<!doctype html>'
        case '4.01':
        case 'transitional':
            return wrap('HTML PUBLIC \'-//W3C//DTD HTML 4.01 Transitional //EN\' \'http://www.w3.org/TR/html4/loose.dtd\'')
        case 'frameset':
            return wrap('HTML PUBLIC \'-//W3C//DTD HTML 4.01 Frameset //EN\' \'http://www.w3.org/TR/html4/frameset.dtd\'')
        case 'xhtml_1.0':
        case 'xhtml_1.0_strict':
        case 'xhtml_strict':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Strict //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\'')
        case 'xhtml_1.0_transitional':
        case 'xhtml_transitional':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Transitional //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\'')
        case 'xhtml_1.0_frameset':
        case 'xhtml_frameset':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.0 Frameset //EN\' \'http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd\'')
        case 'xhtml_1.1':
            return wrap('html PUBLIC \'-//W3C//DTD XHTML 1.1//EN\' \'http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\'')
        default:
            return '<!doctype ' + str + '>'
    }
}

module.exports = util
