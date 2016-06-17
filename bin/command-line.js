#! /usr/bin/env node

var Omelet = require('../lib/omelet.js')
var fs = require('fs')
var chokidar = require('chokidar')
var glob = require('glob')

var configFile = process.argv[2] || 'omelet-config.js'
try {
    var config = require(process.cwd() + '/' + configFile)
} catch (e) {
    console.log(e)
    console.error('No Omelet configuration file found!')
    process.exit()
}

function detectParserFor(filePath) {
    var ext = filePath.split('.').pop().toLowerCase()
    switch (ext) {
    case 'om':
    case 'omelet':
        return 'omelet'
    case 'md':
    case 'markdown':
        return 'markdown'
    }
    return 'copy'
}

var fullPaths = glob.sync(config.input + '/**', {
    nodir: true
})

var omPaths = []
for (var i = 0; i < fullPaths.length; i++) {
    var fp = fullPaths[i].replace(new RegExp('^' + config.input), '')
    if (fullPaths[i] !== configFile) {
        omPaths.push(fp)
    }
}

run()

function run() {
    applyRules(config.rules)
}

function applyRules(rulesObj) {
    var rules = Object.keys(rulesObj)
    var matched = {}
    var count = 0
    omPaths.forEach(function(path) {
        var obj = rulesObj
        rules.forEach(function(rule) {
            glob(config.input + rule, {}, function(err, files) {
                if (err) {
                    throw err
                }
                if (files.indexOf(config.input + path) > -1) {
                    if (matched[path]) {
                        console.warn('Warning: file ' + path + ' matched by multiple rules.\n    Overriding old rule with rule for ' + rule + '.')
                    }
                    matched[path] = obj[rule]
                }
                count++
                if (count >= omPaths.length * rules.length) {
                    getFileInfo(omPaths, matched)
                }
            })
        })
    })
}

function getFileInfo(omPaths, appliedRules) {
    var fileInfo = []
    omPaths.forEach(function(path) {
        var fullPath = config.input + path
        var applied = appliedRules[path] ? appliedRules[path] : {}

        fs.readFile(fullPath, function(err, data) {
            if (err) {
                throw err
            }
            fileInfo.push({
                filePath: path,
                fullPath: fullPath,
                isHidden: applied.hidden || false,
                parser: applied.parser || detectParserFor(fullPath),
                contents: data || undefined
            })
            if (fileInfo.length === omPaths.length) {
                writeAllFiles(fileInfo)
            }
        })
    })
}

function rmDir(dirPath, rmSelf) {
    var files
    try {
        files = fs.readdirSync(dirPath)
    } catch (e) {
        return
    }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i]
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath)
            } else {
                rmDir(filePath, true)
            }
        }
    }
    if (rmSelf) {
        fs.rmdirSync(dirPath)
    }
}

function writeAllFiles(fileInfo) {
    rmDir(config.output, false)

    var om = new Omelet({
        outputDirectory: config.output,
        context: config.context || {},
        permalinks: config.permalinks || false
    })
    om.render(fileInfo)
}