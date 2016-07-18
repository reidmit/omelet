#! /usr/bin/env node

var version = require('../package.json').version
var omelet = require('../lib/omelet.js')
var fs = require('fs')
var pathModule = require('path')
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
// var chokidar = require('chokidar')
var program = require('commander')

var defaultConfigFile = __dirname + '/../doc/omelet-config-default.js'

program
    .version(version)

program
    .command('new [path]')
    .option('-r, --recipe <url>', 'Start new project with recipe')
    .action(function(path, options) {
        var fullPath = path ? pathModule.join(process.cwd(), path) : '.'
        mkdirp(fullPath, function(err) {
            if (err) {
                throw err
            }
            if (options.recipe) {
                fs.stat(fullPath, function(err, stat) {
                    if (err && err.code === 'ENOENT') {
                        // directory doesn't exist
                        var cmd = 'git clone ' + options.recipe + ' ' + fullPath
                        exec(cmd, function(err, stdout, stderr) {
                            if (err) {
                                console.log(err)
                                throw err
                            }
                            console.log('Copied recipe from ' + options.recipe +
                                        ' into ' + path)
                        })
                    } else if (err) {
                        throw err
                    } else {
                        // directory does exist
                        var cmd = 'git clone ' + options.recipe + ' ' + fullPath + '/.omelet-tmp && rm -rf ' + fullPath + '/.omelet-tmp && git reset --hard'
                        exec(cmd, function(err, stdout, stderr) {
                            if (err) {
                                console.log(err)
                                throw err
                            }
                            console.log('Copied recipe from ' + options.recipe +
                                        ' into ' + path)
                        })
                    }
                })

            } else {
                fs.readFile(defaultConfigFile, function(err, data) {
                    if (err) {
                        throw err
                    }
                    var cfPath = pathModule.join(fullPath, 'omelet-config.js')
                    fs.writeFile(cfPath, data, function(err) {
                        if (err) {
                            throw err
                        }
                        console.log('wrote ' + cfPath)
                    })
                })
            }
        })
    })

// program
//     .command('render <path>', {isDefault: true})
//     .option('-o, --output-dir <path>', 'Output directory for rendered files')
//     .option('-w, --watch', 'Watch input file/directory for changes')
//     .option('-s, --strip-comments', 'Strip comment tokens before parsing')
//     .option('-p, --pretty-print', 'Pretty print rendered HTML')
//     .option('-i, --indent-size <num>', 'Number of characters in indent, when pretty printing', parseInt, 4)
//     .option('-C, --indent-char <char>', 'Character to use for indent, when pretty printing', '\' \'')
//     .option('-n, --template-name <name>', 'Name given to compiled template function', 'template')
//     .option('-m, --minify', 'Minify/uglify compiled JS function')
//     .option('-e, --extension', 'Extension to given rendered files', 'html')
//     .option('-M, --modes <path>', 'Path to JS file exporting mode functions')
//     .option('-c, --context <path>', 'Path to JSON file with context variables')
//     .action(function(path, options) {
//         console.log('rendering %s', path)
//     })

// program
//     .command('compile <path>')
//     .option('-o, --output-dir <path>', 'Output directory for rendered files')
//     .option('-w, --watch', 'Watch input file/directory for changes')
//     .option('-s, --strip-comments', 'Strip comment tokens before parsing')
//     .option('-p, --pretty-print', 'Pretty print rendered HTML')
//     .option('-i, --indent-size <num>', 'Number of characters in indent, when pretty printing', parseInt, 4)
//     .option('-C, --indent-char <char>', 'Character to use for indent, when pretty printing', '\' \'')
//     .option('-n, --template-name <name>', 'Name given to compiled template function', 'template')
//     .option('-m, --minify', 'Minify/uglify compiled JS function')
//     .option('-e, --extension', 'Extension to given rendered files', 'html')
//     .option('-M, --modes <path>', 'Path to JS file exporting mode functions')
//     .option('-c, --context <path>', 'Path to JSON file with context variables')
//     .action(function(path, options) {
//         console.log('compiling %s', path)
//     })

program.parse(process.argv)
