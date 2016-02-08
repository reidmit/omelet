var dedent_token = "\u21d0";
var indent_token = "\u21d2";

function attributesToSingleLine(text) {
    return text;

    var sawAt = false;
    var sawTagName = false;
    var sawParen = false;
    var inAttrs = false;
    var out = "";
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        var elseCase = false;

        if (c === "@") {
            if (text.substr(i).test(/^@[a-zA-Z][a-zA-Z0-9_-]*\(/)) {
                //found it
                var stk = ["("];
                var j = i;
                while (stk.length > 0) {

                }
            } else {
                elseCase = true;
            }
        } else {
            elseCase = true;
        }
    }
}

function preprocessIndentation(text) {
    text = attributesToSingleLine(text);

    var lines = text.split("\n").filter(function(s) {
        return !s.split("").every(function(c) {
            return c == " " && c == "\t"
        });
    });
    var processedLines = insertTokens(lines, []);
    return processedLines.join("\n");
}

function insertTokens(lines, stack) {
    if (lines.length === 0) {
        var out = [];
        for (var i=0; i<stack.length; i++) {
            out.push(dedent_token);
        }
        return out;
    }

    var line = lines[0];
    var rest = lines.slice(1);

    var indentation = calculateIndentation(line);
    var top = stack.length ? stack[stack.length-1] : 0;

    if (indentation > top) {
        stack.push(indentation);
        return [indent_token, line].concat(insertTokens(rest, stack))
    }

    if (indentation === top) {
        return [line].concat(insertTokens(rest, stack))
    }

    if (indentation < top) {
        stack.pop();
        return [dedent_token].concat(insertTokens(lines,stack));
    }

}

function calculateIndentation(line) {
    var count = 0;
    for (var i=0; i<line.length; i++) {
        var c = line.charAt(i);
        if (c != " " && c != "\t") break;
        else if (c == " ") count += 1;
        else if (c == "\t") count += 4;
    }
    return count;
}

module.exports.indent_token = indent_token;
module.exports.dedent_token = dedent_token;
module.exports.preprocess = preprocessIndentation;