#! /usr/bin/env node

var version = require('../package.json').version
var omelet = require('../lib/omelet.js')
var fs = require('fs')
var pathModule = require('path')
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
var glob = require('glob')
var chokidar = require('chokidar')
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
                fs.stat(fullPath, function(err, stats) {
                    var cmd

                    if (err && err.code === 'ENOENT') {
                        // directory doesn't exist
                        cmd = 'git clone ' + options.recipe + ' ' + fullPath
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
                        cmd = 'git clone ' + options.recipe + ' ' + fullPath + '/.omelet-tmp && rm -rf ' + fullPath + '/.omelet-tmp && git reset --hard'
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

program
    .command('render <path>', {isDefault: true})
    .action(render)

function render(path, options) {
    fs.stat(path, function(err, stats) {
        if (err) {
            throw err
        }

        if (stats.isFile()) {
            console.log('rendering single file: %s', path)
            console.log(omelet.renderFile(path, options))
        } else if (stats.isDirectory()) {
            glob(pathModule.join(path, '**/*.omelet'), {}, function(err, files) {
                if (err) {
                    throw err
                }
                console.log(files)
                files.forEach(function(file) {
                    console.log('rendering file of many: %s', path)
                    console.log(omelet.renderFile(file, options))
                })
            })
        }
    })
}

program.parse(process.argv)
