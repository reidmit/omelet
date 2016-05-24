var Splitter = require('./split.js');

var s = new Splitter("ignored/outputs", ".omelet-cache");

s.splitAndRender("ignored/split-test.om");