describe("Omelet parser", function() {
    var parse = require('./../../parser.js').parse;
    var input;
    var output;

    beforeEach(function() {
        input = "";
        output = null;
    });

    it("should parse a String", function() {
        input = "test string";
        output = parse(input);

        expect(output.status).toBe(true);
        expect(output.value).toBeDefined();
        expect(output.value.length).toEqual(1);
        expect(output.value[0]).toBeDefined();
        expect(output.value[0].kind).toEqual("String");
        expect(output.value[0].value).toEqual(input);
        expect(output.value[0].start).toEqual(0);
        expect(output.value[0].end).toEqual(input.length);
    });

    it("should parse a Number", function() {
        input = "47";
        output = parse(input);

        expect(output.status).toBe(true);
        expect(output.value).toBeDefined();
        expect(output.value.length).toEqual(1);
        expect(output.value[0]).toBeDefined();
        expect(output.value[0].kind).toEqual("Number");
        expect(output.value[0].value).toEqual(47);
        expect(output.value[0].start).toEqual(0);
        expect(output.value[0].end).toEqual(input.length);
    });

    it("should parse a Comment", function() {
        input = "/* This is a comment */";
        output = parse(input);

        expect(output.status).toBe(true);
        expect(output.value).toBeDefined();
        expect(output.value.length).toEqual(1);
        expect(output.value[0]).toBeDefined();
        expect(output.value[0].kind).toEqual("Comment");
        expect(output.value[0].value).toEqual(47);
        expect(output.value[0].start).toEqual(0);
        expect(output.value[0].end).toEqual(input.length);
    });
});