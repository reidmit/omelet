"use strict";

var parsers = {};

parsers["dust"]   = require('./parsers/dust.js');
parsers["html"]   = require('./parsers/html.js');
parsers["omelet"] = require('./parsers/omelet.js');
parsers["omelet2"] = require('./parsers/omelet2.js');
parsers["liquid"] = require('./parsers/liquid.js');

module.exports = parsers;
