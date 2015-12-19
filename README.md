# Toothrot Engine

An engine for creating text-based games.


## Installation

You need Node.js to run the engine. If you don't have it installed, download it here:
[https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Once you have Node.js up and running, open a terminal window and type:

    npm install -g toothrot

You can now create a new project like this:

```
$ mkdir my_project
$ cd my_project
$ toothrot init
```

Each Toothrot project comes with a `story.md` file which you can find in the `resources` folder.
Edit this file to your liking (see below for an explanation of the format) and then run:

    $ toothrot build

This will package all the resources and create a folder `build/browser/`. To run your story, just
double-click on the `index.html` file or open that file in your browser (drag and drop usually
works, too).

You can also build desktop applications from your story for Linux, Windows and Mac OS X like so:

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
Inheriting means that the object will have all the aspects its prototypes.

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
list of actions. And if the user then clicks on `unlock` the node `unlock_{name}" will be
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

You can check if an aspect is currently active in an object using the `is()` method:

    The door is (! _.o("door").is("closed") ? "closed" : "not closed" !).


### Variables

Variables can be inserted into a node's text by using this notation:

    The variable `foo` contains: ($ foo $)

Variables can be set like this:

    (-) (! $.foo = "bar" !)

What this does is that it assigns the string `"bar"` to the variable `foo`. The
`(-)` at the beginning of the link tells the engine that this line should not be
shown in the node's text.


### JavaScript expressions

A node can contain JavaScript. The JavaScript inside a node gets executed right
before the node is shown. JavaScript can be written in the node's text between
`(!` and `!)`. The value of the JavaScript expression will be inserted into
the text. For example, the following snippets produce the same output:

    Foo is: ($ foo $)

    Foo is: (! $.foo !)

If you don't know much about JavaScript, here are some examples on how to use
it for your story:

#### Comparing variables

    Does `foo` contain `"bar"`?: (! $.foo === "bar" !)


