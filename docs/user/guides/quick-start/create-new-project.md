
/---- previous
[Installation](installation.md)
----/

# Creating a new project

You can now create a new project in the terminal like this:

```
mkdir my_project
cd my_project
toothrot init
```

This will create the following files and folders in `my_project`:

```
+ files
  + style
    - default.css
    - custom.css
  - index.html
+ resources
  + screens
    - main.html
    - pause.html
    - cartridges.html
    - settings.html
  + templates
    - confirm.html
    - notification.html
    - ui.html
  - extras.trot.ext.md
  - story.trot.md
- project.json
```

The `files/` folder contains all the files that are copied as is when you build your project.

The `resources/` folder contains files that will be packed into a `resources.js` file when
you build your project.

The folder `resources/screens/` contains HTML template files for screens. You can customize
the templates to better fit the style of your projects, or add new files here to add new
screens to your game.

The `resources/templates/` folder contains non-screen templates. Currently only `confirm.html`
is used. You can change this file to customize the appearance of confirm dialogs.

The `files/index.html` file is the main file of the project. When you build your projects for
the browser, you can double-click on this file to start the game.

You can customize your game's appearance by changing `files/style/custom.css`. Of course, you
can also add new CSS files to your `files/index.html` file.

The file `project.json` contains information about your project, e.g. for which desktop
platforms you want to build your game.

Finally, the `resources/story.trot.md` file contains the actual story of your game. Your story
must have this file, but it can also have as many additional story files as you want to use.
Additional story files must have the extension `.trot.ext.md`.

You can change all of your project files to your liking, then build your project to run and test it.

/---- next
[Building your project](build-your-project.md)
----/
