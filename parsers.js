"use strict";

var parsers = {};

parsers["html"] = require('./parsers/html.js');
parsers["omelet"] = require('./parsers/omelet.js');

module.exports = parsers;
// module.exports.html   = parsers.html();
// module.exports.omelet = parsers.omelet();
