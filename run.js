var Omelet = require('./omelet.js');

var Om = new Omelet.OmeletInstance({
    outputDirectory: "ignored/outputs",
    prettyPrint: true,
    isWeb: false
})

var ctx = {

}

Om.renderDirectory("ignored/inputs", ctx);

