var __ = require('./util.js');

/*
 * FILTERS
 *
 * All of the filters listed here are the ones supported in Omelet
 * templates (since Toast works as a template engine for Omelet, so
 * it needs to actually run the filters).
 *
 * This file also contains the $translate function, which tries to
 * translate filters from one language to another (e.g. |upper in
 * Omelet and |upcase in Liquid). If it can't translate it, it just
 * passes the given filter name as-is to the other language.
 */

var filters = {};

filters.escape = function(input) {
    return input.replace(/\'/g, "&apos;")
                .replace(/\"/g, "&quot;")
                .replace(/\&/g, "&amp;")
                .replace(/\</g, "&lt;")
                .replace(/\>/g, "&gt;");
}

filters.uppercase = function (input) {
    if (__.isString(input)) {
        return input.toUpperCase();
    } else {
        return input;
    }
}

filters.lowercase = function (input) {
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

/*
 * Given a filter name, a source language, and a target language, attempt
 * to translate the filter name into the corresponding filter name in the
 * target language. If one can't be found, just return the original name.
 * The names of the filters supported by Omelet/Dust/Liquid are as follows:
 */
 var lang_filter_lang = {
     omelet: {
         length: {liquid: "size"},
         upper: {liquid: "upcase"},
         lower: {liquid: "downcase"},
         escape: {liquid: "escape_once", dust: "h"},
         trim: {liquid: "strip"},
         rtrim: {liquid: "rstrip"},
         ltrim: {liquid: "lstrip"},
         truncate_words: {liquid: "truncatewords"},
         safe: {dust: "s"},
         url: {dust: "u", liquid: "url_encode"}
     },
     liquid: {
         size: {omelet: "length"},
         upcase: {omelet: "upper"},
         downcase: {omelet: "lower"},
         escape_once: {omelet: "escape", dust: "h"},
         strip: {omelet: "trim"},
         rstrip: {omelet: "rtrim"},
         lstrip: {omelet: "ltrim"},
         truncatewords: {omelet: "truncate_words"},
         url_encode: {omelet: "url", dust: "u"}
     },
     dust: {
         h: {omelet: "escape", liquid: "escape_once"},
         s: {omelet: "safe"},
         u: {omelet: "url", liquid: "url_encode"},
         uc: {omelet: "url", liquid: "url_encode"}
     }
 }
filters.$translate = function(filterName, sourceLanguage, targetLanguage) {
    if (sourceLanguage === targetLanguage) return filterName;
    if (lang_filter_lang[sourceLanguage] &&
        lang_filter_lang[sourceLanguage][filterName] &&
        lang_filter_lang[sourceLanguage][filterName][targetLanguage]) {
        return lang_filter_lang[sourceLanguage][filterName][targetLanguage];
    } else {
        return filterName;
    }
}

module.exports = filters;
