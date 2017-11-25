
/---- previous
[Create a new project](create-new-project.md)
----/

# Building your project

To create a working game from your project, you need to build it. This can be done by writing
the following in the terminal:

    toothrot build

This will package all the resources and create a folder `my_project/build/browser/`.
To run your game, just double-click on the `index.html` file or open that file in
your browser (drag and drop usually works, too).

You can also build desktop applications from your project for Linux, Windows and Mac OS X like so:

    toothrot build-desktop

This will download a whole lot of stuff the first time you run it. If you have a slow connection,
you can go grab a coffee now. ;)

With the default settings this will built for the following platforms:

 * win32: Windows (32-bit)
 * linux: Linux (32-bit)
 * darwin: Mac OS X (32-bit)

You can change which platforms to build for by opening your project's `project.json` file and
editing the `platforms` property.

You can find the finished desktop builds in `my_project/build/desktop/`.

/---- next
[Where to go from here](what-to-do-next.md)
----/
