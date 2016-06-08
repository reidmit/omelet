var assert = require("assert");

var util = require("../lib/util.js");

describe('Utility functions', function() {
    describe('#repeat()', function() {
        it('should repeat single characters', function() {
            assert.equal("aaaaa", util.repeat("a",5));
        });
        it('should repeat empty string', function() {
            assert.equal("", util.repeat("",100));
        });
        it('should repeat longer strings', function() {
            assert.equal("reidreidreidreid", util.repeat("reid",4));
        });
        it('should handle non-strings', function() {
            assert.equal('4747474747', util.repeat(47,5));
            assert.equal('[object Object][object Object]', util.repeat({},2));
        })
    });
});