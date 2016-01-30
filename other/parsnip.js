var Parsnip = {};

Parsnip.Parser = (function() {
  "use strict";

  // The Parser object is a wrapper for a parser function.
  // Externally, you use one to parse a string by calling
  //   var result = SomeParser.parse('Me Me Me! Parse Me!');
  // You should never call the constructor, rather you should
  // construct your Parser from the base parsers and the
  // parser combinator methods.
  function Parser(action) {
    if (!(this instanceof Parser)) return new Parser(action);
    this._ = action;
  };

  var _ = Parser.prototype;

  function makeSuccess(index, value) {
    return {
      status: true,
      index: index,
      value: value,
      furthest: -1,
      expected: []
    };
  }

  function makeFailure(index, expected) {
    return {
      status: false,
      index: -1,
      value: null,
      furthest: index,
      expected: [expected]
    };
  }

  function mergeReplies(result, last) {
    if (!last) return result;
    if (result.furthest > last.furthest) return result;

    var expected = (result.furthest === last.furthest)
      ? result.expected.concat(last.expected)
      : last.expected;

    return {
      status: result.status,
      index: result.index,
      value: result.value,
      furthest: last.furthest,
      expected: expected
    }
  }

  function assertParser(p) {
    if (!(p instanceof Parser)) throw new Error('not a parser: '+p);
  }

  function formatExpected(expected) {
    if (expected.length === 1) return expected[0];

    return 'one of ' + expected.join(', ')
  }

  function formatGot(stream, error) {
    var i = error.index;

    if (i === stream.length) return ', got the end of the stream'


    var prefix = (i > 0 ? "'..." : "'");
    var suffix = (stream.length - i > 12 ? "...'" : "'");

    return ' at character ' + i + ', got ' + prefix + stream.slice(i, i+12) + suffix
  }

  var formatError = Parsnip.formatError = function(stream, error) {
    return 'expected ' + formatExpected(error.expected) + formatGot(stream, error)
  };

  _.parse = function(stream) {
    if (typeof stream !== 'string') {
      throw new Error('.parse must be called with a string as its argument');
    }
    var result = this.skip(eof)._(stream, 0);

    return result.status ? {
      status: true,
      value: result.value,
      index: result.furthest,
      expected: result.expected
    } : {
      status: false,
      value: result.value,
      index: result.furthest,
      expected: result.expected
    };
  };

  // [Parser a] -> Parser [a]
  var seq = Parsnip.seq = function() {
    var parsers = [].slice.call(arguments);
    var numParsers = parsers.length;

    return Parser(function(stream, i) {
      var result;
      var accum = new Array(numParsers);

      for (var j = 0; j < numParsers; j += 1) {
        result = mergeReplies(parsers[j]._(stream, i), result);
        if (!result.status) return result;
        accum[j] = result.value
        i = result.index;
      }

      return mergeReplies(makeSuccess(i, accum), result);
    });
  };


  var seqMap = Parsnip.seqMap = function() {
    var args = [].slice.call(arguments);
    var mapper = args.pop();
    return seq.apply(null, args).map(function(results) {
      return mapper.apply(null, results);
    });
  };

  var alt = Parsnip.alt = function() {
    var parsers = [].slice.call(arguments);
    var numParsers = parsers.length;
    if (numParsers === 0) return fail('zero alternates')

    return Parser(function(stream, i) {
      var result;
      for (var j = 0; j < parsers.length; j += 1) {
        result = mergeReplies(parsers[j]._(stream, i), result);
        if (result.status) return result;
      }
      return result;
    });
  };

  // -*- primitive combinators -*- //
  _.or = function(alternative) {
    return alt(this, alternative);
  };

  _.then = function(next) {
    if (typeof next === 'function') {
      throw new Error('chaining features of .then are no longer supported, use .chain instead');
    }

    assertParser(next);
    return seq(this, next).map(function(results) { return results[1]; });
  };

  _.many = function() {
    var self = this;

    return Parser(function(stream, i) {
      var accum = [];
      var result;
      var prevResult;

      for (;;) {
        result = mergeReplies(self._(stream, i), result);

        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else {
          return mergeReplies(makeSuccess(i, accum), result);
        }
      }
    });
  };

  _.times = function(min, max) {
    if (arguments.length < 2) max = min;
    var self = this;

    return Parser(function(stream, i) {
      var accum = [];
      var start = i;
      var result;
      var prevResult;

      for (var times = 0; times < min; times += 1) {
        result = self._(stream, i);
        prevResult = mergeReplies(result, prevResult);
        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else return prevResult;
      }

      for (; times < max; times += 1) {
        result = self._(stream, i);
        prevResult = mergeReplies(result, prevResult);
        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else break;
      }

      return mergeReplies(makeSuccess(i, accum), prevResult);
    });
  };

  _.map = function(fn) {
    var self = this;
    return Parser(function(stream, i) {
      var result = self._(stream, i);
      if (!result.status) return result;
      return mergeReplies(makeSuccess(result.index, fn(result.value)), result);
    });
  };

   _.skip = function(next) {
    return seq(this, next).map(function(results) { return results[0]; });
  };

  _.mark = function() {
    return seqMap(index, this, index, function(start, value, end) {
      return { start: start, value: value, end: end };
    });
  };

  _.desc = function(expected) {
    var self = this;
    return Parser(function(stream, i) {
      var reply = self._(stream, i);
      if (!reply.status) reply.expected = [expected];
      return reply;
    });
  };

  // -*- primitive parsers -*- //
  var string = Parsnip.string = function(str) {
    var len = str.length;
    var expected = "'"+str+"'";

    return Parser(function(stream, i) {
      var head = stream.slice(i, i+len);

      if (head === str) {
        return makeSuccess(i+len, head);
      }
      else {
        return makeFailure(i, expected);
      }
    });
  };

  // var regex = Parsnip.regex = function(re, group) {
  //   var anchored = RegExp('^(?:'+re.source+')', (''+re).slice((''+re).lastIndexOf('/')+1));
  //   var expected = '' + re;
  //   if (group == null) group = 0;

  //   return Parser(function(stream, i) {
  //     var match = anchored.exec(stream.slice(i));

  //     if (match) {
  //       var fullMatch = match[0];
  //       var groupMatch = match[group];
  //       if (groupMatch != null) return makeSuccess(i+fullMatch.length, groupMatch);
  //     }

  //     return makeFailure(i, expected);
  //   });
  // };

  // var letter = Parsnip.letter = regex(/[a-z]/i).desc('a letter')
  // var letters = Parsnip.letters = regex(/[a-z]*/i)
  // var digit = Parsnip.digit = regex(/[0-9]/).desc('a digit');
  // var digits = Parsnip.digits = regex(/[0-9]*/)
  // var whitespace = Parsnip.whitespace = regex(/\s+/).desc('whitespace');
  // var optWhitespace = Parsnip.optWhitespace = regex(/\s*/);

  // var any = Parsnip.any = Parser(function(stream, i) {
  //   if (i >= stream.length) return makeFailure(i, 'any character');

  //   return makeSuccess(i+1, stream.charAt(i));
  // });

  // var all = Parsnip.all = Parser(function(stream, i) {
  //   return makeSuccess(stream.length, stream.slice(i));
  // });

  var eof = Parsnip.eof = Parser(function(stream, i) {
    if (i < stream.length) return makeFailure(i, 'EOF');

    return makeSuccess(i, null);
  });

  // var test = Parsnip.test = function(predicate) {
  //   return Parser(function(stream, i) {
  //     var char = stream.charAt(i);
  //     if (i < stream.length && predicate(char)) {
  //       return makeSuccess(i+1, char);
  //     }
  //     else {
  //       return makeFailure(i, 'a character matching '+predicate);
  //     }
  //   });
  // };

  // var oneOf = Parsnip.oneOf = function(str) {
  //   return test(function(ch) { return str.indexOf(ch) >= 0; });
  // };

  // var noneOf = Parsnip.noneOf = function(str) {
  //   return test(function(ch) { return str.indexOf(ch) < 0; });
  // };

  var lazy = Parsnip.lazy = function(desc, f) {
    if (arguments.length < 2) {
      f = desc;
      desc = undefined;
    }

    var parser = Parser(function(stream, i) {
      parser._ = f()._;
      return parser._(stream, i);
    });

    if (desc) parser = parser.desc(desc)

    return parser;
  };

  return Parser;
})();

module.exports = Parsnip;