# Omelet

Omelet is a language for writing web pages & templates that compiles
into HTML. It does for HTML what Sass/SCSS/Less do for CSS. The syntax
is inspired by Jade and Haml, but its expressiveness is more on the
level of the Liquid templating engine - it explicitly disallows the
embedding/execution of raw code to enforce the separation of model and
view.

    @html
      @head
        @title Hello, world!
      @body
        @h1 Hey there...
        @p Check out my {@b|i blog posts} below:
        @ul
          @@for post in /path/to/posts sortby date:
            @li.post-preview
              @span.post-title
                {post.title}
              @span.post-date
                posted on {post.date}
              @a[href={post.url}]
                read more...

This project adheres to the [Open Code of Conduct][code-of-conduct]. By participating, you are expected to honor this code.
[code-of-conduct]: https://github.com/reid47/omelet-lang/blob/master/CONDUCT.md
