var Toast = require('./toast.js');

var T = new Toast.ToastInstance({
    sourceLanguage: "omelet",
    targetLanguage: "html",
    outputDirectory: "ignored/docs2/outputs",
    prettyPrint: true,
    isWeb: false
})

var ctx = require("./ignored/docs2/templates/config.json");

T.renderDirectory("ignored/docs2", ctx);
// var output = T.renderFile("ignored/docs2/filters.oml", ctx);
// console.log("OUTPUT:")
// console.log(output);
