var Toast = require('./toast-o.js');

var T = new Toast.Toast({
    sourceLanguage: "omelet",
    targetLanguage: "dust",
    prettyPrint: false,
    isWeb: false
})

var output = T.renderString("@h1 Hello, world!", {}, "oml2dust");
console.log("OUTPUT:")
console.log(output);
