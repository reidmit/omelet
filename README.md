# Omelet
A new template language and universal transpiler for templating languages.

Omelet is currently in its early stages. I make no guarantees that this will work correctly for you at this point if you choose to try it out.

    def name = "Omelet, a new template language"

    (html ::
        (head ::
            (title :: Introducing {name}.))
        (body ::
            (h1 :: This is Omelet!))

If you do want to test it out, you'll need Node installed. Clone this repo onto your local machine, navigate to the directory, and run `node readfile.js`. It currently reads Omelet code from `other/test_input.omelet` and outputs HTML to `other/test_output.html`.