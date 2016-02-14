function replaceSuffix(term) {
  var last = term.charAt(term.length-1);
  if (last === "*") {
    term = term.replace("*",".many()");
  } else if (last === "+") {
    term = term.replace("+",".atLeast(1)");
  } else if (last === "?") {
    term = term.replace("?",".atMost(1)");
  }
  return term;
}

function p(str) {

  //BASE CASES:

  //the string is a single term (no spaces, |s, parens)
  if (str.indexOf("(")===-1 &&
      str.indexOf(" ")===-1 &&
      str.indexOf("|")===-1) {
    return replaceSuffix(str);
  }

  var a = [];
  var stk = [];
  var curr = "";
  var inParens = false;

  for (var i=0; i<str.length; i++) {
    if (str.charAt(i)===" ") {
      if (inParens) {
        curr += str.charAt(i);
      } else {
        a.push(curr);
        curr = "";
      }
    } else if (str.charAt(i)==="(") {
      if (stk.length===0) {
        curr = "";
        inParens = true;
      }
      stk.push(i);
    } else if (str.charAt(i)===")") {
      stk.pop();
      if (stk.length === 0) {
        //a.push(curr);
        //curr = "";
        inParens = false;
      } else {
        curr += str.charAt(i);
      }
    } else {
      curr += str.charAt(i);
    }
  }

  if (curr !== "") {
    a.push(curr);
  }


  console.log(a);
}

console.log(p("LBRACE _ (IDENT_COMPLEX | IDENT) _ (MACRO_ARGUMENT _)* FILTER* RBRACE"));

console.log(p("LBRACE*"));