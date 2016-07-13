# Omelet

[![Build Status](https://travis-ci.org/reid47/omelet.svg?branch=master)](https://travis-ci.org/reid47/omelet) [![Coverage Status](https://coveralls.io/repos/github/reid47/omelet/badge.svg?branch=master)](https://coveralls.io/github/reid47/omelet?branch=master)

Omelet is a front-end language for writing web pages and web templates. Like many template languages, an Omelet file is compiled into a JavaScript function that takes in an evaluation context and returns a string (usually HTML). It uses a clean, whitespace-sensitive syntax similar to that of Pug or Haml. But unlike those languages, Omelet is designed to enforce model-view separation; there is no way to execute arbitrary code within Omelet.

Instead, Omelet focuses on providing front-end developers with a powerful,
flexible set of features that encourage modular and reusable code.

Here's an example of what it looks like:

    ## import a directory of Omelet files, so we can access it as a
    ## list of objects called 'posts'

    >import-dir path/to/posts as posts

    ## a macro called 'preview' that takes 3 parameters

    +preview title date url =
      @li.post-preview
        @span.post-title {title}
        @span.post-date posted on {date}
        @a[href={url}] read more...

    ## some markup, including a for-loop over 'posts'

    @html
      @head
        @title Hello, world!
      @body
        @h1 Hey there...
        @p Check out my {@b|i blog posts} below:
        @ul
          >for post in posts | sort_by "date"
            {preview post.title post.date post.url}

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.
[code-of-conduct]: https://github.com/reid47/omelet-lang/blob/master/CONDUCT.md
