// var errors = require('./errors.js');
var util = {};

util.inheritsFrom = function(child,parent) {
    child.prototype = new parent;
    child.prototype.constructor = parent;
    if (parent.constructor == Function) {
        child.prototype.parent = parent.prototype;
    } else {
        child.prototype.parent = parent;
    }
}

util.typeOf = function(obj) {
    var t = ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1];
    if (t !== "Object") {
        if (t === "Array") {
            var t0 = util.typeOf(obj[0]);
            for (var i=0; i<obj.length; i++) {
                if (t0 !== util.typeOf(obj[i])) {
                    t0 = "Dynamic";
                    break;
                }
            }
            return "Array<"+t0+">";
        } else {
            return t;
        }
    }
    return obj.constructor.name;
}

util.isNumber = function(o) { return util.typeOf(o) === "Number"; }
util.isString = function(o) { return util.typeOf(o) === "String"; }
util.isBoolean = function(o) { return util.typeOf(o) === "Boolean"; }
util.isArguments = function(o) { return util.typeOf(o) === "Arguments"; }
util.isDate = function(o) { return util.typeOf(o) === "Date"; }
util.isArray = function(o) { return util.typeOf(o).indexOf("Array") === 0; }
util.isObject = function(o) { return util.typeOf(o) === "Object"; }

//Takes in a list of given types (as Strings) and a
//list of expected types (as Strings). Compares them
//with above typeOf function, throws error if bad.
util.checkFilterArgs = function(func,args,types) {
    args = [].slice.call(args);
    if (args.length !== types.length) {
        // errors.TypeError(
        //     "Incorrect number of arguments given to filter `"+
        //     func.name+"`. Expected "+types.length+" but got "+
        //     args.length+"."
        // );
    }
    for (var i=0; i<types.length; i++) {
        if (util.typeOf(args[i]) !== types[i]) {
            throw new TypeError("bad");
        }
    }
}

util.repeat = function(s,n) {
    var out = "";
    while (n > 0) {
        out += s;
        n--;
    }
    return out;
}

util.contains = function(array,item) {
    for (var i=0; i<array.length; i++) {
        if (array[i] === item) {
            return true;
        }
    }
    return false;
}

util.toMap = function(commaSeparatedItems) {
    var o = {};
    var items = commaSeparatedItems.split(",");
    items.forEach(function(item) {
        o[item] = true;
    });
    return o;
}

util.printAST = function(ast) {
    console.log(JSON.stringify(ast.value,null,4));
}

module.exports = util;