/*
* Visitor pattern for Toast common AST
*/

function visitNode(node, func, acc) {
    switch (node.kind) {
        case "Array":
            func(node,acc);
            for (var i=0; i<node.elements.length; i++) {
                visitNode(node.elements[i],func,acc);
            }
            break;
        case "Assignment":
            func(node,acc)
            visitNode(node.leftSide,func,acc);
            visitNode(node.rightSide,func,acc);
            break;
        case "Attribute":
            func(node,acc);
            visitNode(node.name,func,acc);
            visitNode(node.value,func,acc);
            break;
        case "Boolean":
            func(node,acc)
            break;
        case "Comment":
            func(node,acc);
            break;
        case "CommentHTML":
            func(node,acc);
            break;
        case "Doctype":
            func(node,acc);
            break;
        case "Document":
            func(node,acc);
            if (node.extend) {
                visitNode(node.extend,func,acc);
            }
            if (node.imports) {
                for (var i=0; i<node.imports.length; i++) {
                    visitNode(node.imports[i],func,acc);
                }
            }
            for (var i=0; i<node.contents.length; i++) {
                visitNode(node.contents[i],func,acc);
            }
            break;
        case "Extend":
            func(node,acc);
            visitNode(node.file,func,acc);
            break;
        case "Filter":
            func(node,acc);
            visitNode(node.name,func,acc);
            for (var i=0; i<node.arguments.length; i++) {
                visitNode(node.arguments[i],func,acc);
            }
            break;
        case "ForEach":
            func(node,acc);
            visitNode(node.iterator,func,acc);
            visitNode(node.data,func,acc);
            for (var i=0; i<node.body.length; i++) {
                visitNode(node.body[i],func,acc);
            }
            if (node.elseCase) {
                for (var i=0; i<node.elseCase.length; i++) {
                    visitNode(node.elseCase[i],func,acc);
                }
            }
            break;
        case "Identifier":
            func(node,acc);
            if (node.modifiers) {
                for (var i=0; i<node.modifiers.length; i++) {
                    visitNode(node.modifiers[i],func,acc);
                }
            }
            break;
        case "IfStatement":
            func(node,acc);
            visitNode(node.predicate,func,acc);
            for (var i=0; i<node.thenCase.length; i++) {
                visitNode(node.thenCase[i],func,acc);
            }
            if (node.elifCases) {
                for (var i=0; i<node.elifCases.length; i++) {
                    visitNode(node.elifCases[i],func,acc);
                }
            }
            if (node.elseCase) {
                for (var i=0; i<node.elseCase.length; i++) {
                    visitNode(node.elseCase[i],func,acc);
                }
            }
            break;
        case "Import":
            func(node,acc);
            break;
        case "Include":
            func(node,acc);
            visitNode(node.file,func,acc);
            break;
        case "InternalConditional":
            func(node,acc);
            visitNode(node.thenCase,func,acc);
            visitNode(node.elseCase,func,acc);
            break;
        case "Interpolation":
            func(node,acc);
            visitNode(node.name,func,acc);
            for (var i=0; i<node.arguments.length; i++) {
                visitNode(node.arguments[i],func,acc);
            }
            for (var i=0; i<node.filters.length; i++) {
                visitNode(node.filters[i],func,acc);
            }
            break;
        case "MacroDefinition":
            func(node,acc);
            visitNode(node.name,func,acc);
            for (var i=0; i<node.params.length; i++) {
                visitNode(node.params[i],func,acc);
            }
            visitNode(node.body,func,acc);
            break;
        case "Modifier":
            func(node,acc);
            visitNode(node.value,func,acc);
            break;
        case "Number":
            func(node,acc);
            break;
        case "Parenthetical":
            func(node,acc);
            for (var i=0; i<node.inner.length; i++) {
                visitNode(node.inner[i],func,acc);
            }
            for (var i=0; i<node.filters.length; i++) {
                visitNode(node.filters[i],func,acc);
            }
            break;
        case "Range":
            func(node,acc);
            visitNode(node.startIndex,func,acc);
            visitNode(node.endIndex,func,acc);
            break;
        case "String":
            func(node,acc);
            break;
        case "Symbol":
            func(node,acc);
            break;
        case "Tag":
            func(node,acc);
            visitNode(node.name,func,acc);
            for (var i=0; i<node.attributes.length; i++) {
                visitNode(node.attributes[i],func,acc);
            }
            for (var i=0; i<node.inner.length; i++) {
                visitNode(node.inner[i],func,acc);
            }
            if (node.filters) {
                for (var i=0; i<node.filters.length; i++) {
                    visitNode(node.filters[i],func,acc);
                }
            }
            break;
        default:
            console.log("visitor got to default case");
            break;
    }
    return acc;
}

module.exports.visit = visitNode;