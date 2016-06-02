var fs = require('fs');
var mkdirp = require('mkdirp');
var parse = require('./parser.js').parse;
var renderer = require('./renderer.js');

var Splitter = function(outputDirectory, cacheDirectory) {
    outputDirectory = outputDirectory || ".";
    cacheDirectory = cacheDirectory || false;

    var fileTreeInfo = [];

    // TODO: check indentation level of all inner lines of file
    // to ensure greater than /line

    function getFileExtensionFor(path) {
        var iDot = path.lastIndexOf(".");
        var iSlash = path.lastIndexOf("/");
        if (iDot > -1 && iDot > iSlash) {
            return "";
        }
        return ".om";
    }

    var indent_re = new RegExp(/^[ ]+/);
    function mergeLines(linesInFile) {
        if (linesInFile.length === 0) return "";

        //get the indentation level of the first line
        var firstLine = linesInFile[0];
        var match = firstLine.match(indent_re);
        if (match) {
            var indentLevel = match[0].length;
            var indentToRemove = new RegExp("^[ ]{"+indentLevel+"}");

            return linesInFile.map(function(line) {
                return line.replace(indentToRemove,"");
            }).join("\n");
        } else {
            return linesInFile.join("\n");
        }
    }

    function dropWhile(list, f) {
        var newList = [];
        var i = 0;
        while (i < list.length) {
            if (f(list[i]))
                i++;
            else
                break;
        }
        for (var j=i; j<list.length; j++) {
            newList.push(list[j]);
        }
        return newList;
    }

    //found here, modified slightly: https://gist.github.com/liangzan/807712
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

    // regex for matching a file/directory header line
    // matches returned by line.match(re) look like this:
    // 0: full input string
    // 1: "index" or "withExtension.css" (pathPart)
    // 2: undefined or ".css", if extension
    // 3: undefined or "*", if hidden
    // 4: undefined or "[parserName]", if parser given
    // 5: undefined or "parserName", if parser given
    var re = new RegExp(/^\/([a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z0-9]+)?)[ ]*(\*)?[ ]*(\[([a-z]+)\])?$/);

    // TODO: handle empty files better

    function splitFiles(path, input, isHidden, parser) {
        var lines = input.split("\n");
        var hasFileStart = false;
        for (var i=0; i<lines.length; i++) {
            var line = lines[i];
            var linesInFile = [];
            var match = line.match(re);
            if (match !== null) {
                var pathPart = match[1];
                var fileExtension = match[2] ? match[2].substring(1) : undefined;
                var fileIsHidden = match[3] ? true : false;
                fileIsHidden = isHidden || fileIsHidden;
                var fileParser = match[5] ? match[5] : parser;

                hasFileStart = true;
                for (var j=i+1; j<lines.length; j++) {
                    var nextLine = lines[j];
                    if (re.test(nextLine)) {
                        // remove initial blank lines
                        linesInFile = dropWhile(linesInFile, function(line) {
                            return line === "";
                        });

                        // finish collecting lines, merge lines into
                        // single file, and recurse on that file
                        var fileContents = mergeLines(linesInFile);
                        splitFiles(path+"/"+pathPart, fileContents, fileIsHidden, fileParser);
                        linesInFile = [];
                        break;
                    } else {
                        // collect another line
                        linesInFile.push(nextLine);
                    }
                }
                if (linesInFile.length > 0) {
                    // (edge case) at the end of the file, if we have any lines
                    // collected, merge them into one file and recurse on it
                    linesInFile = dropWhile(linesInFile, function(line) {
                        return line === "";
                    });
                    var fileContents = mergeLines(linesInFile);
                    splitFiles(path+"/"+pathPart, fileContents, fileIsHidden, fileParser);
                    linesInFile = [];
                }
            }
        }
        if (!hasFileStart) {
            path = path.length === 0 ? filePath : path;

            var fullPath = (outputDirectory+
                            (cacheDirectory ? "/"+cacheDirectory : "")+
                            path+getFileExtensionFor(path))
                            .split("/")
                            .map(function(s) { return s.replace(/\*$/,"") })
                            .join("/");

            var pathWithoutFile = fullPath.substring(0, fullPath.lastIndexOf("/"));
            var fileOnly = fullPath.substring(fullPath.lastIndexOf("/"));

            // store the file info
            fileTreeInfo.push({
                fullPath: fullPath,
                filePath: path,
                isHidden: isHidden,
                parser: parser || "omelet",
                contents: input
            });

            // write the cache file
            if (cacheDirectory !== false) {
                // make all necessary directories, if they don't exist
                mkdirp(pathWithoutFile, function(err) {
                    if (err) return console.error(err);
                });

                try {
                    fs.writeFile(fullPath, input, 'utf-8');
                } catch(e) {
                    return console.log(e);
                }
                console.log("Cache file '"+fullPath+"' written successfully.");
            }
        }
    }

    function writeFiles(fileInfo, context, prettyPermalinks) {
        context = context || {};

        // add the contents of each file into the context
        for (var i=0; i<fileInfo.length; i++) {
            context[fileInfo[i].filePath] = fileInfo[i];
        }

        for (var i=0; i<fileInfo.length; i++) {
            var file = fileInfo[i];
            // only write files that aren't hidden
            if (!file.isHidden) {
                var rd = new renderer.Renderer({
                    sourceLanguage: file.parser,
                    outputDirectory: outputDirectory,
                    prettyPermalinks: prettyPermalinks
                });

                if (file.parser !== "copy") {
                    rd.renderString(file.contents.toString(), file.parser, context, file.filePath);
                } else {
                    //copy file
                }
            }
        }
    }

    this.splitAndRender = function(filePath, context, prettyPermalinks) {
        var input = "";
        if (fs.lstatSync(filePath).isFile()) {
            input = fs.readFileSync(filePath).toString();
        }
        //remove all existing files in outputDirectory
        // NOTE: this may be a very bad idea
        rmDir(outputDirectory, false);

        fileTreeInfo = [];

        mkdirp(outputDirectory, function (err) {
            if (err) return console.error(err);
            splitFiles("", input, false);
            writeFiles(fileTreeInfo, context, prettyPermalinks);
        });
    }
}

module.exports = Splitter;
