var __ = require('./util.js');

/*
 * FILTERS
 *
 * All of the filters listed here are the ones supported in Omelet
 * templates (since Toast works as a template engine for Omelet, so
 * it needs to actually run the filters).
 */

var filters = {};

filters.escape = function(input) {
    return input.replace(/\'/g, "&apos;")
                .replace(/\"/g, "&quot;")
                .replace(/\&/g, "&amp;")
                .replace(/\</g, "&lt;")
                .replace(/\>/g, "&gt;");
}

filters.upper = function (input) {
    if (__.isString(input)) {
        return input.toUpperCase();
    } else {
        return input;
    }
}

filters.lower = function (input) {
    if (__.isString(input)) {
        return input.toLowerCase();
    } else {
        return input;
    }
}

filters.trim = function (input) {
    if (__.isString(input)) {
        return input.replace(/^\s\s*/,'').replace(/\s\s*$/,'');
    } else {
        return input;
    }
}

filters.ltrim = function(input) {
    if (__.isString(input)) {
        return input.replace(/^\s\s*/,'')
    } else {
        return input;
    }
}

filters.rtrim = function(input) {
    if (__.isString(input)) {
        return input.replace(/\s\s*$/,'')
    } else {
        return input;
    }
}

filters.replace = function(input, pattern, replacement) {
    var input = ""+input;
    var re = new RegExp(pattern, "g");
    return input.replace(re, replacement);
}

filters.default = function(input, defaultValue) {
    return (input === "" || typeof input === "undefined" ||
            input === null) ? defaultValue : input;
}

filters.truncate = function(input, n) {
    if (__.isString(input)) {
        return input.replace( /\s\s+/g, ' ' ).slice(0,n)+"...";
    } else {
        return input;
    }
}

filters.truncate_words = function(input, n) {
    if (__.isString(input)) {
        var arr = input.replace( /\s\s+/g, ' ' ).split(" ");
        if (n >= arr.length) {
            return arr.join(" ");
        }
        arr.splice(n);
        return arr.join(" ")+"...";
    } else {
        return input;
    }
}

filters.append = function(input, str) {
    return ""+input+str;
}

filters.prepend = function(input, str) {
    return ""+str+input;
}

filters.length = function(input) {
    if (__.isString(input) || __.isArray(input)) {
        return input.length;
    }
    return 1;
}

filters.starts_with = function(input, needle) {
    if (__.isString(input) || __.isArray(input)) {
        return input.indexOf(needle) === 0;
    } else {
        return false;
    }
}

filters.ends_with = function(input, needle) {
    if (__.isString(input) || __.isArray(input)) {
        return input.indexOf(needle) === (input.length - needle.length);
    } else {
        return false;
    }
}

filters.contains = function(input, other) {
    if (__.isArray(input) || __.isString(input)) {
        return input.indexOf(other) !== -1;
    }
    return false;
}

filters.split = function(input, separator) {
    if (__.isString(input)) {
        return input.split(separator);
    } else {
        return [input];
    }
}

filters.join = function(input, separator) {
    if (!__.isArray(input)) {
        input = [input];
    }
    return input.join(separator);
}

filters.ompath = function(input, pretty) {
    var lastDot = input.lastIndexOf(".");
    if (lastDot > -1) {
        // the file extension is given, so don't add one
        return "."+input;
    } else {
        if (pretty) {
            return "."+input+"/index.html";
        }
        return "."+input+".html"
    }
}

module.exports = filters;
