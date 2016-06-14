/*
* Visitor pattern for Toast common AST
*/
var i

function visitNode(node, func, acc) {
    if (node.kind === 'Array') {
        func(node,acc)
        for (i=0; i<node.elements.length; i++) {
            visitNode(node.elements[i],func,acc)
        }
    } else if (node.kind === 'Attribute') {
        func(node,acc)
        visitNode(node.name,func,acc)
        visitNode(node.value,func,acc)
    } else if (node.kind === 'Boolean') {
        func(node,acc)
    } else if (node.kind === 'Comment') {
        func(node,acc)
    } else if (node.kind === 'CommentHTML') {
        func(node,acc)
    } else if (node.kind === 'Doctype') {
        func(node,acc)
    } else if (node.kind === 'Document') {
        func(node,acc)
        if (node.extend) {
            visitNode(node.extend,func,acc)
        }
        if (node.imports) {
            for (i=0; i<node.imports.length; i++) {
                visitNode(node.imports[i],func,acc)
            }
        }
        for (i=0; i<node.contents.length; i++) {
            visitNode(node.contents[i],func,acc)
        }
    } else if (node.kind === 'Extend') {
        func(node,acc)
        visitNode(node.file,func,acc)
    } else if (node.kind === 'Filter') {
        func(node,acc)
        visitNode(node.name,func,acc)
        for (i=0; i<node.arguments.length; i++) {
            visitNode(node.arguments[i],func,acc)
        }
    } else if (node.kind === 'ForEach') {
        func(node,acc)
        visitNode(node.iterator,func,acc)
        visitNode(node.data,func,acc)
        for (i=0; i<node.body.length; i++) {
            visitNode(node.body[i],func,acc)
        }
        if (node.elseCase) {
            for (i=0; i<node.elseCase.length; i++) {
                visitNode(node.elseCase[i],func,acc)
            }
        }
    } else if (node.kind === 'Identifier') {
        func(node,acc)
        if (node.modifiers) {
            for (i=0; i<node.modifiers.length; i++) {
                visitNode(node.modifiers[i],func,acc)
            }
        }
    } else if (node.kind === 'IfStatement') {
        func(node,acc)
        visitNode(node.predicate,func,acc)
        for (i=0; i<node.thenCase.length; i++) {
            visitNode(node.thenCase[i],func,acc)
        }
        if (node.elifCases) {
            for (i=0; i<node.elifCases.length; i++) {
                visitNode(node.elifCases[i],func,acc)
            }
        }
        if (node.elseCase) {
            for (i=0; i<node.elseCase.length; i++) {
                visitNode(node.elseCase[i],func,acc)
            }
        }
    } else if (node.kind === 'Import') {
        func(node,acc)
    } else if (node.kind === 'Include') {
        func(node,acc)
        visitNode(node.file,func,acc)
    } else if (node.kind === 'Interpolation') {
        func(node,acc)
        visitNode(node.name,func,acc)
        for (i=0; i<node.arguments.length; i++) {
            visitNode(node.arguments[i],func,acc)
        }
        for (i=0; i<node.filters.length; i++) {
            visitNode(node.filters[i],func,acc)
        }
    } else if (node.kind === 'Definition') {
        func(node,acc)
        visitNode(node.name,func,acc)
        for (i=0; i<node.params.length; i++) {
            visitNode(node.params[i],func,acc)
        }
        visitNode(node.body,func,acc)
    } else if (node.kind === 'Modifier') {
        func(node,acc)
        visitNode(node.value,func,acc)
    } else if (node.kind === 'Number') {
        func(node,acc)
    } else if (node.kind === 'String') {
        func(node,acc)
    } else if (node.kind === 'Tag') {
        func(node,acc)
        visitNode(node.name,func,acc)
        for (i=0; i<node.attributes.length; i++) {
            visitNode(node.attributes[i],func,acc)
        }
        for (i=0; i<node.inner.length; i++) {
            visitNode(node.inner[i],func,acc)
        }
        if (node.filters) {
            for (i=0; i<node.filters.length; i++) {
                visitNode(node.filters[i],func,acc)
            }
        }
    } else {
        // console.log('visitor got to default case')
    }
    return acc
}

module.exports.visit = visitNode
