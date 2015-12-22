var __ = require('./util.js');

var assertions = {};

assertions.hasType = function(given,expected) {
    check({
        pred: __.typeOf(given) === expected,
        fail: "Object "+given+" does not have type "+expected+"."
    });
}

assertions.assert = function(pred) {
    check({
        pred: pred,
        fail: "Assertion does not evaluate to true."
    });
}

assertions.hasLength = function(array,n) {
    check({
        pred: array.length === n,
        fail: "Array "+array+" does not have length "+n
    });
}

function check(obj) {
    if (!obj.pred) {
        throw new AssertionError(obj.fail);
    }
}

module.exports = assertions;