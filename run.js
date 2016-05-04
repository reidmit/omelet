/*
 * This file demonstrates how Toast can be used from within Node.js
 * programs. It translates all of the Omelet language reference pages,
 * which are written in Omelet, into HTML. The input files are located
 * in omelet-ref/inputs, and the output HTML files will be placed in
 * omelet-ref/outputs. After running this file with "node run.js",
 * you will be able to open up {your path to}/omelet-ref/outputs/index.html
 * in your browser and see the documentation pages.
 *
 * If you'd rather not run the code yourself, you can see the input
 * and output files in this repo:
 *      https://github.com/reid47/toast/tree/gh-pages/omelet-ref
 * and you can visit the actual web pages here:
 *      http://reidmitchell.net/toast/omelet-ref/
 */

// We import the Toast class
var Toast = require('./toast.js');

// We create a new instance of Toast, given a set of
// options (see docs/usage-nodejs.txt for more on these)
var T = new Toast.ToastInstance({
    sourceLanguage: "omelet",
    targetLanguage: "html",
    outputDirectory: "omelet-ref/outputs",
    prettyPrint: true,
    isWeb: false
})

// We use an external JSON file as our evaluation context
var ctx = require("./omelet-ref/inputs/templates/config.json");

// We render all files in the omelet-ref/inputs directory
T.renderDirectory("omelet-ref/inputs", ctx);

