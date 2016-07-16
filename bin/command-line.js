#! /usr/bin/env node

console.time('req')

var version = require('../package.json').version
var omelet = require('../lib/omelet.js')
var fs = require('fs')
var path = require('path')
// var chokidar = require('chokidar')
var program = require('commander')
console.timeEnd('req')

console.time('prrgam')

program
    .version(version)

program
    .command('render <path>', {isDefault: true})
    .option('-o, --output-dir <path>', 'Output directory for rendered files')
    .option('-w, --watch', 'Watch input file/directory for changes')
    .option('-s, --strip-comments', 'Strip comment tokens before parsing')
    .option('-p, --pretty-print', 'Pretty print rendered HTML')
    .option('-i, --indent-size <num>', 'Number of characters in indent, when pretty printing', parseInt, 4)
    .option('-C, --indent-char <char>', 'Character to use for indent, when pretty printing', '\' \'')
    .option('-n, --template-name <name>', 'Name given to compiled template function', 'template')
    .option('-m, --minify', 'Minify/uglify compiled JS function')
    .option('-e, --extension', 'Extension to given rendered files', 'html')
    .option('-M, --modes <path>', 'Path to JS file exporting mode functions')
    .option('-c, --context <path>', 'Path to JSON file with context variables')
    .action(function(path, options) {
        console.log('rendering %s', path)
    })

program
    .command('compile <path>')
    .option('-o, --output-dir <path>', 'Output directory for rendered files')
    .option('-w, --watch', 'Watch input file/directory for changes')
    .option('-s, --strip-comments', 'Strip comment tokens before parsing')
    .option('-p, --pretty-print', 'Pretty print rendered HTML')
    .option('-i, --indent-size <num>', 'Number of characters in indent, when pretty printing', parseInt, 4)
    .option('-C, --indent-char <char>', 'Character to use for indent, when pretty printing', '\' \'')
    .option('-n, --template-name <name>', 'Name given to compiled template function', 'template')
    .option('-m, --minify', 'Minify/uglify compiled JS function')
    .option('-e, --extension', 'Extension to given rendered files', 'html')
    .option('-M, --modes <path>', 'Path to JS file exporting mode functions')
    .option('-c, --context <path>', 'Path to JSON file with context variables')
    .action(function(path, options) {
        console.log('compiling %s', path)
    })

program.parse(process.argv)

console.timeEnd('prrgam')
