function ASTNode() {
    //Start index in code
    this.start = null;
    //End index in code
    this.end = null;
    //Kind of node (== subclass name)
    this.kind = null;
    //... other properties depend on node
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
    for (var prop in properties) {
        this[prop] = properties[prop];
    }
}

ast.Attribute = function Attribute(properties) {
    this.kind = "Attribute";
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

ast.Parenthetical = function Parenthetical(properties) {
    this.kind = "Parenthetical";
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

ast.Assignment = function String(properties) {
    this.kind = "Assignment";
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