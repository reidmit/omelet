var Toast = require('./toast.js');

var T = new Toast.ToastInstance({
    sourceLanguage: "omelet",
    targetLanguage: "html",
    outputDirectory: "omelet-ref/outputs",
    prettyPrint: true,
    isWeb: false
})

var ctx = require("./omelet-ref/inputs/templates/config.json");

T.renderDirectory("omelet-ref/inputs", ctx);

