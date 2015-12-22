var assert = require('./assertions.js');

var filters = {};

//TODO: type-check parameters

/* STRING FILTERS */

filters.uppercase = function(input) {
    return input.toUpperCase();
}

filters.lowercase = function(input) {
    return input.toLowerCase();
}

filters.trim = function(input) {
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

module.exports = filters;