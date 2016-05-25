#! /usr/bin/env node

var Omelet = require("../lib/Omelet.js");

/*
Arguments:
    argv[2] = inputFile
    outputDirectory (optional)
    context (optional)
*/

function printUsage() {
    var lines = [
        "usage: omelet inputFile [-d outputDirectory] [-c contextFile] [-h, --help]",
        "    inputFile            path to the file containing your Omelet code",
        "    -d outputDirectory   the directory to contain your rendered files",
        "                           (optional, default is ./omelet-output)",
        "    -c contextFile       path to a JSON file containing initial evaluation context",
        "                           (optional, default is an empty context)",
        "    -h, --help           print this usage information"
    ];
    console.log(lines.join("\n"))
}

if (process.argv.length < 3) {
    printUsage();
    process.exit();
}

if (process.argv.indexOf("-h") > -1 ||
    process.argv.indexOf("--help") > -1) {
    printUsage();
    process.exit();
}

var inputFile = process.argv[2];

var outputDirectory = "omelet-output";
var d_idx = process.argv.indexOf("-d");
if (d_idx > 2) {
    if (!process.argv[d_idx+1]) {
        console.error("No directory name given to -d option.");
        process.exit();
    }
    outputDirectory = process.argv[d_idx+1];
}

var context = {};
var c_idx = process.argv.indexOf("-c");
if (c_idx > 2) {
    if (!process.argv[c_idx+1]) {
        throw Error("No file path given to -c option.");
    }
    var contextFile = process.argv[c_idx+1];
    context = require(contextFile);
}

var om = new Omelet({
    // cacheDirectory: ".omelet-cache",
    outputDirectory: outputDirectory,
    context: context
});

om.render(inputFile);