describe("Omelet to HTML", function() {

    var parser = require('../parser.js').omelet();
    var evaluate = require('../evaluators.js').html;
    var input;
    var ast;
    var output;

    beforeEach(function() {
        input = undefined;
        ast = undefined;
        output = undefined;
    });

    afterEach(function() {

    });

    it("should parse numbers", function() {
        input = "47";

        ast = parser.parse(input);
        expect(ast.status).toBe(true);
        output = evaluate(ast.value, input, {});

        expect(output).toBe("47");
    });

    it("should handle simple tags correctly", function() {
        input = "(h1 :: Hello, world!)";

        ast = parser.parse(input);
        expect(ast.status).toBe(true);
        output = evaluate(ast.value, input, {});

        expect(output).toBe("<h1>Hello, world!</h1>");
    });

})