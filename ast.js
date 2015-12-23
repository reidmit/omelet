function ASTNode() {
    //Start index in code
    this.start = null;
    //End index in code
    this.end = null;
    //Kind of node (== subclass name)
    this.kind = null;
    //Value of node
    this.value = null;
}

var ast = {};

ast.Identifier = function Identifier(properties) {
    this.kind = "Identifier";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Tag = function Tag(properties) {
    this.kind = "Tag";
    this.name = null; //e.g. "h6" in <h6></h6> or (h6||...)
    this.inner = null;
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Attribute = function Attribute(properties) {
    this.kind = "Attribute";
    this.name = null;
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Number = function Number(properties) {
    this.kind = "Number";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.String = function String(properties) {
    this.kind = "String";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Range = function Range(properties) {
    this.kind = "Range";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Filter = function String(properties) {
    this.kind = "Filter";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Comment = function Comment(properties) {
    this.kind = "Comment";
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

module.exports = ast;