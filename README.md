# Toothrot Engine

An engine for creating text-based games.


## Installation

You need Node.js to run the engine. If you don't have it installed, download it here:
[https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Once you have Node.js up and running, open a terminal window and type:

    $ npm install -g toothrot

## Creating a new project

You can now create a new project in the terminal like this:

```
$ mkdir my_project
$ cd my_project
$ toothrot init
```

This will create the following files and folders in `my_project`:

```
+ files
  + style
    - default.css
    - indicator.gif
  - index.html
+ resources
  + screens
    - main.html
    - pause.html
    - save.html
    - settings.html
  + templates
    - confirm.html
  - objects.json
  - story.md
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

The `resources/objects.json` file contains object definitions. See the section about objects
in this README for details.

The `files/index.html` file is the main file of the project. When you build your projects for
the browser, you can double-click on this file to start the game.

You can customize your game's appearance by changing `files/style/default.css`. Of course, you
can also add new CSS files to your `files/index.html` file.

The file `project.json` contains information about your project, e.g. for which desktop
platforms you want to build your game.

Finally, the `resources/story.md` file contains the actual story of your game.

You can change all of your project files to your liking, then build your project to run and test it.

## Building your project

To create a working game from your project, you need to build it. This can be done by writing
the following in the terminal:

    $ toothrot build

This will package all the resources and create a folder `my_project/build/browser/`.
To run your game, just double-click on the `index.html` file or open that file in
your browser (drag and drop usually works, too).

You can also build desktop applications from your project for Linux, Windows and Mac OS X like so:

    $ toothrot build-desktop

This will download a whole lot of stuff the first time you run it. If you have a slow connection, you can go grab a coffee now. ;)

With the default settings this will built for the following platforms:

 * win32: Windows (32-bit)
 * win64: Windows (64-bit)
 * linux32: Linux (32-bit)
 * linux64: Linux (64-bit)
 * osx32: Mac OS X (32-bit)
 * osx64: Max OS X (64-bit)

You can change which platforms to build for by opening your project's `project.json` file and
editing the `platforms` property.

You can find the finished desktop builds in `my_project/build/desktop/`.


## The Story Format

Toothrot Engine comes with its own story format. It looks similar to [markdown](https://de.wikipedia.org/wiki/Markdown) and has some special parts to structure your story.

A basic story file looks like this:


    #: My Story
    
    ##: default_section
    
    
    ###: start
    
    This is some text with **markdown** formating.
    
    And (: this is a link to another node => another_node :). Click it.
    
    
    ###: another_node
    
    This is the text of another node.
    
    (<)


A toothrot story file is divided into sections (starting with "##:") and nodes
(starting with "###:").

Nodes are pieces of text that are displayed one at a time. The first node is always
the `start` node.

### Next nodes

Nodes can have a next node. The next node can be reached by clicking somewhere on the screen
or by pressing either the `SPACE` or `RIGHT` button. You can specify the next node by writing
`(>) name_of_next_node` on a new line. For example, if you want the next node of the node
`my_node` to be `another_node`, you can write it like this:

```
###: my_node

Some text.

(>) another_node
```

Sometimes you will want to create many connected nodes that don't need to be accessible from
somewhere else. There's a shorthand notation for such nodes:

```
###: boring_story

Once upon a time, there was a man.
(~~~)
He married a woman from another village.
(~~~)
They had a lot of children.
(~~~)
The man and the woman grew older and older.
(~~~)
Then they died.
```

In this example, we have a named node `boring_story` and a bunch of connected nodes
defined by `(~~~)`.


### Returning to the last node

A node can specify that its *next* node is the last node that was shown before the
current node. This is as easy as writing this on a new line at the end of your node:

    (<)

### Linking to other nodes

You can link to other nodes in a node's text by using this notation:

    This is a link: (: click me => another_node :)

Everything between the `(:` and `:)` is translated to a link. The first part
before the `=>` is the link text. The second part, after the `=>` is the
name of the node that will be reached when the user clicks on the link.

### Object links

In traditional text adventures, you can use a verb on an object. This usually looks like this:

    open door

You can do something similar with Toothrot's object links. An object link, when clicked, will show
a list of actions that can be used upon the link text (the "object").

Object links can be written like this:

    This is an object link: (# door => {"open": "open_door", "examine": "examine_door"} #)

When someone clicks on this link (which has the text `door`), then a menu with the actions
`open` and `examine` will appear. When you click on `open` then the node `open_door` will
be shown. And if you click on `examine`, the node `examine_door` will be shown instead.

The menu of actions can also be closed without doing anything by clicking somewhere on the screen
or by using the `ESC` key.

If object links are too simple for what you want to do, objects are an alternative.

### Objects

Objects in Toothrot are defined in the `resources/objects.json` file. Each object can
have many different aspects, and each aspect defines actions that can be used upon
the object. Each object has a list of currently active aspects and when the object
is printed in a node's text, only those actions of currently active aspects will be
shown.

An example `objects.json` file looks like this:

```json
{
    "closable": {
        "label": "closable thing",
        "prototypes": [],
        "activeAspects": ["closed"],
        "aspects": {
            "closed": {
                "open": "open_{name}"
            },
            "open": {
                "close": "close_{name}"
            }
        }
    },
    "door": {
        "label": "door",
        "prototypes": ["closable"],
        "activeAspects": ["closed", "locked"],
        "aspects": {
            "locked": {
                "unlock": "unlock_{name}"
            },
            "unlocked": {
                "lock": "lock_{name}"
            }
        }
    }
}
```

This file defines two different objects: `closable` and `door`.

The `prototypes` property contains the names of other objects to inherit from.
Inheriting means that the object will have all the aspects of its prototypes
on top of its own aspects.

In the example, the `door` object has the `closable` object as a prototype. Therefore,
the `door` object will have these aspects: `closed`, `open`, `locked` and `unlocked`.

The `activeAspects` property contains the currently active aspects at the point
of creation of the object. This list can be changed during the story using the
object's JavaScript API.

The `aspects` property contains the object's own aspects. For example, the `door`
object has an own aspect `locked` with an associated action `unlock`.

Each action of an object defines the name of a node that will be shown when the user first
clicks on the object and then on the name of the action. So if a user clicks on the `door`
object while the `locked` aspect is active, then the `unlock` action will be shown in the
list of actions. And if the user then clicks on `unlock` the node `unlock_{name}` will be
shown. The `{name}` portion of the node name is always replaced with the *actual* name of
the object, not the name of the object the aspect is inherited from.

This means that the action `unlock` on the `door` object will lead to the node `unlock_door`,
but the action `open` on the same object will **not** lead to the node `open_closable`. Instead
this will lead to the node `open_door`!

You must always make sure that the node referenced in an action actually exists. If it doesn't
exist then an error will be displayed in the browser console once a node containing the object
is displayed - and instead of the object link you will see an ugly `undefined` in the node's text.

#### Object JavaScript API

Objects can be printed and manipulated using JavaScript.

To print the `door` object, you can write this:

    (! _.o("door").print() !)

If you want to print the `door` object with another label, you can do it like this:

    (! _.o("door").print("some strange door") !)

If you permanently alter an object's label, use the `.label()` method:

    (-) (! _.o("door").label("some strange door") !)

You can change the `door` object's active aspects like so:

    (-) (! _.o("door").drop("closed").add("open") !)

The `.drop()` method drops an aspect from an object's list of active aspects.

The `.add()` method adds an aspect to an object's list of active aspects.

You can check if an aspect is currently active in an object using the `.is()` method:

    The door is (! _.o("door").is("closed") ? "closed" : "not closed" !).

You can also change the target node of an object's action using `.rewire()`:

    (-) (! _.o("magicDoor").rewire("enter", "door_location_2") !)


## Variables

Variables can be inserted into a node's text by using this notation:

    The variable `foo` contains: ($ foo $)

Variables can be set like this:

    (-) (! $.foo = "bar" !)

What this does is that it assigns the string `"bar"` to the variable `foo`. The
`(-)` at the beginning of the link tells the engine that this line should not be
shown in the node's text.


## JavaScript

A node can contain JavaScript. The JavaScript inside a node gets executed right
before the node is shown. JavaScript can be written in the node's text between
`(!` and `!)`. The last value of the JavaScript snippet will be inserted into
the text.

### The variable container: $

Inside the JavaScript snippets, there are two main ways in which you can interact
with the engine. The first is `$`. It's an object containing all of the game's
current variables.

For example, the following snippets produce the same output:

    Foo is: ($ foo $)

    Foo is: (! $.foo !)

### The function container: _

The next way to interact with the engine from a JavaScript snippet is the
*environment* `_`. It contains a bunch of functions to alter the game's state
in some way or help you write your scripts.

#### _.skipTo(nodeId)

The `skipTo(nodeId)` function skips the current node immediately before showing
any text or effects or playing any audio. The following will skip the node where
it is written and continue with the node `foo` instead:

    _.skipTo("foo")

#### _.o(objectName)

The `o(name)` function returns the API of a story object:

    _.o("door").print()

To find out more about objects, read the README section about it.


#### _.link(label, target)

Creates a direct link to another node:

    You can (! _.link("go to the other room", "other_room") !).

#### _.objectLink(label, actions)

Creates an object link:

    There's a (! _.objectLink("bird", {"talk to": "talk_to_bird", examine: "examine_bird"}) !) here.

#### _.dim(amount)

Dims the background:

    (-) (! _.dim(0.8) !)

Dim values must be between `0` (not dimmed, background fully visible) and `1`
(fully dimmed, all black).

#### _.oneOf(a1, a2, ..., aN)

Returns one of its arguments randomly:

    (-) (! $.hairColor = _.oneOf("blond", "brown", "black", "red", "white", "gray") !)

### Silencing script output

You can also remove any script output from the node text by writing `(-)` on the
line where the script starts:

    (-) (! "foo" + "bar" !)


## Node and section properties

Both nodes and sections can be augmented with properties. To add a property
to a node or section, add the following on an empty line somewhere in the
node's or section's text:

    (#) theKey: "theValue"

In this example, a property `theKey` is defined with a string value of `"theValue"`.
The value of a property can be any JSON value like `string`, `number`, `boolean`,
`array`, `object` or `null`.

If a property is defined for a section, it will affect all the nodes contained
within that section. If a property is defined for a node, it will only belong
to the node itself.

If both a node and its section define the same property, then the node's property
is used.

**WARNING:** You can change a node's internal properties with this. It's a good
idea to only change those properties mentioned in the documentation! At the time of
this writing, the internal properties are: `id`, `line`, `options`, `links`, `next`
and `returnToLast`. Never change these properties unless you really know what
you're doing!



## Audio

You can play audio files with Toothrot. There are three different kinds of audio,
and each has its own "channel" (meaning its own volume):

 * sound: Sounds that are played once when something happens, e.g. glass breaking, door shutting.
 * music: Looping background music.
 * ambience: Looping ambience (noise) tracks, e.g. ocean waves or restaurant chatter.

You can use node properties to play audio. To play a sound, at a `sound` property to your node:

    (#) sound: "doorShutting.ogg"

To start a background music track (or change the one currently playing), use:

    (#) music: "mainTheme.ogg"

And for playing or changing the ambience track:

    (#) ambience: "restaurant.ogg"

You can stop whatever is playing on a channel by setting it to `false`:

    (#) music: false

And if you want to stop all audio at once, use this:

    (#) audio: false

The paths to your audio files is relative to the `index.html` file of your built project.
So if you write this:

    (#) sound: "beep.ogg"

It plays the file `my_project/files/beep.ogg`. And if you write:

    (#) sound: "sounds/beep.ogg"

Then it plays `my_project/files/sounds/beep.ogg`.

If you build your project for the use in browsers, you might need to supply different formats of
the same audio file. You can specify alternatives like this:

    (#) sound: ["sounds/beep", "ogg", "mp3"]

The browser will choose the format it supports automatically, so it will either play
`my_project/files/sounds/beep.ogg` or `my_project/files/sounds/beep.mp3`.

