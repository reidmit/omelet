/*
 * Omelet Grammar
 * ==========================
 * Parses Omelet into an AST
 */
{
function Node(type,value) {
    this.type = type;
    this.value = value;
}
function TagNode(name) {
    this.type = "tag";
    this.name = name;
    this.inner;
}
function AttributeNode(key,value) {
    this.type = "attribute";
    this.key = key;
    this.value = value;
}
function IndentNode(size) {
    this.type = "indent";
    this.size = size;
}
function StringNode(str) {
    this.type = "string";
    this.value = str;
}
var indentLevel = 0;
function setIndent(n) {
    indentLevel = n;
    return n;
}
}

Expression
  = Tags

Tags
  = Tag Tags / Tag

Tag
  = indent:Indent At tagname:Identifier [ ]* attrs:AttributeList? inner:Tag? &{return indent.size<indentLevel;}{
        //indent is increasing
        var n = new TagNode(tagname);
        n.attributes = attrs;
        if (inner) {
            n.inner = inner;
        }
        if (indent) {
            n.indent = setIndent(indent.size);
        }
        return n;
    } /
    indent:Indent At tagname:Identifier [ ]* attrs:AttributeList? next:Tag? &{return indent.size>=indentLevel;}{
        //indent is same or less(bad!)
        var n = new TagNode(tagname);
        n.attributes = attrs;
        if (indent) {
            n.indent = setIndent(indent.size);
        }
        return [n,next];
    } /
    At tagname:Identifier [ ]* attrs:AttributeList? inner:Tag? {
        var n = new TagNode(tagname);
        n.attributes = attrs;
        if (inner) {
            n.inner = inner;
        }
        n.indent = setIndent(0);
        return n;
    } /
    indent:Indent s:String {
        var n = new StringNode(s);
        n.indent = setIndent(indent.size);
        return n;
    }

AttributeList
  = LBracket OptSpace fst:Attribute ls:(OptSpace ArrSep OptSpace Attribute)* OptSpace RBracket {
        var arr = [fst];
        for (var i = 0; i<ls.length; i++) {
            arr[i+1] = ls[i][3];
        }
        return arr;
    }

Attribute
  = key:Identifier OptSpace Equals OptSpace value:String {
        return new AttributeNode(key,value);
    }

OptSpace = [ ]*

Equals   = "="
LBracket = "["
RBracket = "]"
ArrSep   = "|"

String
  = s:[^|\]\n]+ {
        return new StringNode(s.join(""));
    }

At = "@"

Integer "integer"
  = [0-9]+ { return parseInt(text(), 10); }

Identifier
  = [a-zA-Z][a-zA-Z0-9]* { return text(); }

Indent
  = spaces:([\n][ ]*) {
        return new IndentNode(spaces[1].length);
    }

_ "whitespace"
  = [ \t\n\r]*