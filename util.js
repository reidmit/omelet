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
            var t0 = __.typeOf(obj[0]);
            for (var i=0; i<obj.length; i++) {
                if (t0 !== __.typeOf(obj[i])) {
                    t0 = "Dynamic";
                    break;
                }
            }
            return "List<"+t0+">";
        } else {
            return t;
        }
    }
    return obj.constructor.name;
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