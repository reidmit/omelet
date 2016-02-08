var assert = require('./assertions.js');
var __ = require('./util.js');
var markdown = require("markdown").markdown;

var filters = {};

//TODO: type-check parameters & check arguments.length

/*
STRING FILTERS
(these filters return strings)
*/

filters.markdown = filters.md = function(input) {
    return markdown.toHTML(input);
}

filters.escape = function(input) {
    return input.replace(/\'/g, "&apos;")
                .replace(/\"/g, "&quot;")
                .replace(/(?![^\s]+\;)\&/g, "&amp;")
                .replace(/\</g, "&lt;")
                .replace(/\>/g, "&gt;");
}

filters.uppercase = function (input) {
    __.checkFilterArgs(filters.uppercase,arguments,["String"]);
    return input.toUpperCase();
}

filters.lowercase = function (input) {
    return input.toLowerCase();
}

filters.capitalize = function(input) {
    return input.split(" ").map(function(word) {
        return word.charAt(0).toUpperCase()+word.slice(1);
    }).join(" ");
}

filters.trim = function (input) {
    return input.replace(/^\s\s*/,'').replace(/\s\s*$/,'');
}

filters.ltrim = function(input) {
    return input.replace(/^\s\s*/,'')
}

filters.rtrim = function(input) {
    return input.replace(/\s\s*$/,'');
}

filters.append = function(input, suffix) {
    return input+suffix;
}

filters.prepend = function(input, prefix) {
    return prefix+input;
}

filters.strip_whitespace = function(input) {
    return input.replace(/\s/g,'');
}

filters.remove = function(input, toRemove) {
    var re = new RegExp(toRemove, 'g');
    return input.replace(re,'');
}

filters.remove_first = function(input, toRemove) {
    var re = new RegExp(toRemove);
    return input.replace(re,'');
}

filters.replace = function(input, pattern, replacement) {
    var re = new RegExp(pattern);
    return input.replace(re,replacement);
}

filters.default = function(input, defaultValue) {
    return (input === "") ? defaultValue : input;
}

//TODO: figure out what this should do to nested tags.
//right now it just chops up tags like strings
filters.truncate = function(input, n) {
    return input.replace( /\s\s+/g, ' ' ).slice(0,n)+"...";
}

filters.truncate_words = function(input, n) {
    console.log(n);
    var arr = input.replace( /\s\s+/g, ' ' ).split(" ");
    if (n >= arr.length) {
        return arr.join(" ");
    }
    arr.splice(n);
    return arr.join(" ")+"...";
}

filters.today = function(_) {
    return new Date();
}

filters.date_format = function(input, formatString) {
    var date = new Date(input);
    var days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday",
                  "Saturday"];
    var months = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"]
    var options = {
        //DAY of week, short (Tue, Wed, etc.)
        "w": days[date.getDay()].substring(0,3),

        //DAY of week, full (Tuesday, Wednesday, etc.)
        "W": days[date.getDay()],

        //DAY, numeric, no leading zeros (1 to 31)
        "d": date.getDate().toString(),

        //DAY, numeric, with leading zeros (01 to 31)
        "D": (date.getDate().toString().length > 1) ?
                date.getDate().toString() : "0"+date.getDate(),

        //MONTH, full (January, February, etc.)
        "N": months[date.getMonth()],

        //MONTH, short (Jan, Feb, etc.)
        "n": months[date.getMonth()].substring(0,3),

        //MONTH, numeric, no leading zeros (1 to 12)
        "m": (date.getMonth()+1).toString(),

        //MONTH, numeric, with leading zeros (01 to 12)
        "M": ((date.getMonth()+1).toString().length > 1) ?
                (date.getMonth()+1).toString() : "0"+(date.getMonth()+1),

        //YEAR, last 2 digits (15, etc.)
        "y": date.getFullYear().toString().slice(2),

        //YEAR, all 4 digits (2015, etc.)
        "Y": date.getFullYear().toString()
    };
    var out = [];
    for (var i=0; i<formatString.length; i++) {
        var c = formatString.charAt(i);
        if (options[c]) { out.push(options[c]); }
        else            { out.push(c); }
    }
    return out.join("");
}

filters.if_then_else = function(input,thenCase,elseCase) {
    return input ? thenCase : elseCase;
}

/*
NUMBER FILTERS
(these filters return numbers)
*/

filters.length = function(input) {
    if (__.isString(input) || __.isArray(input)) {
        return input.length;
    }
    throw Error("`length` filter can only be applied to Strings and Arrays");
}

/*
BOOLEAN FILTERS
(these filters return booleans)
*/

filters.defined = filters.def = function(input) {
    return input !== undefined;
}

filters.empty = function(input) {
    if (__.isString(input)) {
        return input === "";
    }
    if (__.isArray(input)) {
        return input.length === 0;
    }
    if (__.isObject(input)) {
        return Object.keys(input).length === 0;
    }
    throw Error("`empty` filter can only be applied to Strings, Arrays, or Objects.");
}

filters.lt = filters.less_than = filters["<"] = function(input, other) {
    if (!isNaN(input) && !isNaN(input)) {
        return parseInt(input) < parseInt(other);
    }
    return input < other;
}

filters.gt = filters.greater_than = filters[">"] = function(input, other) {
    if (!isNaN(input) && !isNaN(input)) {
        return parseInt(input) > parseInt(other);
    }
    return input > other;
}

filters.leq = filters.less_than_equals = filters["<="] = function(input, other) {
    if (!isNaN(input) && !isNaN(input)) {
        return parseInt(input) <= parseInt(other);
    }
    return input <= other;
}

filters.geq = filters.greater_than_equals = filters[">="] = function(input, other) {
    if (!isNaN(input) && !isNaN(input)) {
        return parseInt(input) >= parseInt(other);
    }
    return input >= other;
}

filters.eq = filters.equals = filters["=="] = function(input, other) {
    if (!isNaN(input) && !isNaN(other)) {
        return parseInt(input) === parseInt(other);
    }
    return input === other;
}

filters.starts_with = function(input, needle) {
    return input.indexOf(needle) === 0;
}

filters.ends_with = function(input, needle) {
    return input.indexOf(needle) === (input.length - needle.length);
}

filters.starts_with_vowel = function(input) {
    return /[aeiouAEIOU]/.test(input.charAt(0));
}

filters.contains = function(input, other) {
    if (__.isArray(input) || __.isString(input)) {
        return input.indexOf(other) !== -1;
    } else {
        throw Error("`contains` filter can only be applied to a String or an Array");
    }
}

module.exports = filters;