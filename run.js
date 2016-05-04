var Toast = require('./toast.js');

var T = new Toast.ToastInstance({
    sourceLanguage: "omelet",
    targetLanguage: "html",
    outputDirectory: "ignored/omelet",
    prettyPrint: true,
    isWeb: false
})

var ctx = require("./ignored/omelet/templates/config.json");

T.renderDirectory("ignored/omelet", ctx);
// var output = T.renderFile("ignored/docs2/filters.oml", ctx);
// console.log("OUTPUT:")
// console.log(output);
