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

filters.remove = function(input, toRemove) {
    var re = new RegExp(toRemove, 'g');
    return input.replace(re,'');
}

filters.remove_first = function(input, toRemove) {
    var re = new RegExp(toRemove);
    return input.replace(re,'');
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

module.exports = filters;