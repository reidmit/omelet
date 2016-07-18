/*
 * OMELET CONFIGURATION FILE
 *
 * The Omelet build system will use the settings below to render your files.
 *
 * None of the below settings is required. If one is not given, the default
 * setting will be used. See the Omelet docs for all defaults.
 *
 * By default, a package.json file has not been created. However,
 * if you need to use other npm modules, you'll need to run `npm init`
 * to create your package.json, run `npm install` for any necessary
 * modules, and require them here with `require`.
 */

module.exports = {

    // Directory or single file to use as input (.omelet files only)
    input: '.',

    // Directory to output your rendered files (path relative to this file)
    outputDir: '_site',

    // Indent rendered HTML files nicely
    prettyPrint: true,

    // Evaluation context given to all templates when rendered
    context: {},

    // Modes to use in templates (i.e. :mode_name) - each must be a function
    modes: {},

/*
 * LESSER USED SETTINGS
 * Included as examples, but you can just delete these to use the defaults.
 */

    // File extension to give rendered Omelet files
    extension: 'html',

    // Number of characters in indent, when prettyPrint is true
    indentSize: 2,

    // Character to use for indents, when prettyPrint is true
    indentChar: ' ',

    // Minify/uglify compiled JavaScript functions
    minify: false,

    // Name to give to compiled JavaScript functions
    templateName: 'template'
}