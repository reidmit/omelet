"use strict";

var parsers = {};

parsers["html"] = require('./parsers/html.js');
parsers["omelet"] = require('./parsers/omelet.js');

module.exports = parsers;
