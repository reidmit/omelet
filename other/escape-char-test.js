var fs = require('fs');

fs.readFile("escape-char-test.reid", function(err, contents) {
    //successfully replaces (stuff) but not \(stuff)
    console.log(contents.toString().replace(/([^\\])\([^\)]*\)/g,"$1"+"REPLACED"));
});