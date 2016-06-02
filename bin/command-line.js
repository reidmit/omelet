#! /usr/bin/env node

var Omelet = require("../lib/omelet.js");
var fs = require("fs");
var glob = require("glob");

var configFile = process.argv[2] || "omelet-config.json";
var config = require(process.cwd()+"/"+configFile);

var inp = config.input;

var fullPaths = glob.sync(inp+"/**", {
    nodir: true
});

var omPaths = [];
for (var i=0; i<fullPaths.length; i++) {
    var fp = fullPaths[i].replace(new RegExp("^"+inp), "");
    omPaths.push(fp);
}

// applyRules -> getFileInfo -> ?
applyRules(config.rules);

function applyRules(rulesObj) {
    var rules = Object.keys(rulesObj);
    var matched = {};
    var count = 0;
    omPaths.forEach(function(path) {
        var obj = rulesObj;
        rules.forEach(function(rule) {
            glob(inp+rule, {}, function(err, files) {
                if (err) throw err;
                if (files.indexOf(inp+path) > -1) {
                    if (matched[path])
                        console.warn("Warning: file "+path+" matched by multiple rules.\n    Overriding old rule with rule for "+rule+".");

                    matched[path] = obj[rule];
                }
                count++;
                if (count >= omPaths.length*rules.length)
                    getFileInfo(omPaths, matched);
            })
        });
    });
}

function detectParserFor(filePath) {
    var ext = filePath.split(".").pop().toLowerCase();
    switch (ext) {
        case "om":
        case "omelet":
            return "omelet";
    }
    return "copy";
}

// now, we need to automatically build the list of paths w/options
// for each FILE, we need to have:
//     filePath, fullPath, isHidden, parser, contents
function getFileInfo(omPaths, appliedRules) {
    var fileInfo = [];
    omPaths.forEach(function(path) {
        var fullPath = inp+path;
        var applied = appliedRules[path] ? appliedRules[path] : {};

        fs.readFile(fullPath, function(err,data) {
            if (err) throw err;
            fileInfo.push({
                filePath: path,
                fullPath: fullPath,
                isHidden: applied.hidden || false,
                parser: applied.parser || detectParserFor(fullPath),
                contents: data || undefined
            });
            if (fileInfo.length === omPaths.length) {
                writeAllFiles(fileInfo);
            }
        });
    });
}

function rmDir(dirPath, rmSelf) {
    try { var files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            } else {
                rmDir(filePath, true);
            }
        }
    }
    if (rmSelf) fs.rmdirSync(dirPath);
}

function writeAllFiles(fileInfo) {
    rmDir(config.output, false);

    var om = new Omelet({
        outputDirectory: config.output,
        context: config.context || {},
        prettyPermalinks: config.permalinks || false
    });

    om.render(fileInfo);
}

// /*
// Arguments:
//     argv[2] = inputFile
//     outputDirectory (optional)
//     context (optional)
//     prettyPermalinks (optional)
// */

// function printUsage() {
//     var lines = [
//         "usage: omelet inputFile [-d outputDirectory] [-c contextFile] [-h, --help]",
//         "    inputFile            path to the file containing your Omelet code",
//         "    -d outputDirectory   the directory to contain your rendered files",
//         "                           (optional, default is ./omelet-output)",
//         "    -c contextFile       path to a JSON file containing initial evaluation context",
//         "                           (optional, default is an empty context)",
//         "    -p, --permalinks     instead of making path/to/file.html, make path/to/file/index.html,",
//         "                           so URLs look a little cleaner (can leave off index.html)",
//         "                           (optional, default is OFF)",
//         "    -h, --help           print this usage information"
//     ];
//     console.log(lines.join("\n"))
// }

// if (process.argv.length < 3) {
//     printUsage();
//     process.exit();
// }

// if (process.argv.indexOf("-h") > -1 ||
//     process.argv.indexOf("--help") > -1) {
//     printUsage();
//     process.exit();
// }

// var inputFile = process.argv[2];

// var outputDirectory = "omelet-output";
// var d_idx = process.argv.indexOf("-d");
// if (d_idx > 2) {
//     if (!process.argv[d_idx+1]) {
//         console.error("No directory name given to -d option.");
//         process.exit();
//     }
//     outputDirectory = process.argv[d_idx+1];
// }

// var context = {};
// var c_idx = process.argv.indexOf("-c");
// if (c_idx > 2) {
//     if (!process.argv[c_idx+1]) {
//         throw Error("No file path given to -c option.");
//     }
//     var contextFile = process.argv[c_idx+1];
//     context = require(contextFile);
// }

// var prettyPermalinks = false;
// var pp_idx = process.argv.indexOf("-p");
// if (pp_idx > 2) {
//     prettyPermalinks = true;
// }

// var watch = false;
// var w_idx = process.argv.indexOf("-w");
// if (w_idx > 2) {
//     watch = true;
// }

// var om = new Omelet({
//     // cacheDirectory: ".omelet-cache",
//     outputDirectory: outputDirectory,
//     context: context,
//     prettyPermalinks: prettyPermalinks
// });

// om.render(inputFile);
