/*
Filename extensions for all of the languages supported by Toast.
Each language has a list of possible extensions. For outputting
files, the first one in the list will be used.
*/

var extensions = {
    "html":     ["html","htm"],
    "dust":     ["dust.html"],
    "jade":     ["jade"],
    "markdown": ["md","markdown"],
    "omelet":   ["oml","omelet"],
    "smarty":   ["tpl"]
}

function extensionFor(language) {
    return extensions[language][0];
}

module.exports.for = extensionFor;