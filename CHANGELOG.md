# Changelog

## 2.0.0 (TBD)

* Changes to text stream interface (think *Lifeline* series)
* The `objects.json` file and corresponding API removed
* Tags, flags and properties added to nodes
* Nodes can now contain other nodes
* Internal JS code switched to a component architecture, improving maintainability
* Introduces scripts and slots
* Object links have been removed
* Improved default theme
* Savegame slots removed, using PNG images as "datacards" instead
* Introduces a hierarchy for node tags
* Screens can now have embedded scripts
* Desktop builds now use electron instead of NW.js
* Adds `autonext` property
* Makes it possible to define default settings in the main story file

Story format now uses markdown-like syntax where appropriate:

| v1 Syntax             | v2 Syntax           | Description                           |
|:----------------------|:--------------------|:--------------------------------------|
| `#: My Story`         | `# My Story`        | Story title.                          |
| `##: Section`         | `## Section`        | Section ID.                           |
| `###: Node`           | `### Node`          | Node ID.                              |
| `(~~~)`               | `***`               | Creates anonymous text nodes.         |
| `(: foo => bar :)`    | `[foo](#bar)`       | Links to node `bar` using text `foo`. |
| `(! doSomething() !)` | ``` `@slot` ```     | Executes JS code, inserts result.     |
| `($ foo $)`           | ``` `$foo` ```      | Inserts a variable `foo`.             |

Various new methods have been added to the env object (`_`) or were changed:

* `_.event(textOrObject)`: Adds an event.
* `_.last([tag])`: Returns the name of the last node, or if `tag` is given, the last node with
  the tag.
* `_.save(savegameId[, then])`: Saves the current state of the game under `savegameId`.
* `_.load(savegameId[, then])`: Loads a savegame.
* `_.notify(text[, type[, duration]])`: Displays a notification.
* `_.dim()`: Has been removed.

The following new global variables are now available in scripts:

* `engine`: The toothrot engine context. Can be used to use components directly or to send events
  or to listen to them.
* `__file`: The file name of the current script (story file or screen file).


## 1.5.0 (2016-12-09)

Adds some new methods to the env ("_") object given to a node's JavaScript snippets:

 * _.node() returns the node about to be displayed
 * _.addOption(label, target, value) adds a new option to the options menu of the node

Also introduces these new features:

 * Automatically create an appcache file for browser builds
 * Remove browser UI when a game is added to the homescreen
 * Add basic ARIA / screen reader support
 * Screens can now contain script tags. These are evaluated as if they were inside nodes,
   so that `$` and `_` are available there as well, and variables can be changed.

And improves some things and fixes some bugs:

 * Fix unicode encoding issues
 * Using next or back on nodes with options now works, too
 * Fixed: Variables not cleared in clearState()
 * Show curtain when the section changes
 * Disable zoom on mobile devices
 * Builder now puts out colored messages on console
 * Keyboard highlighter now works for scrolled content
 * Replaces move.js with transform.js to fix various glitches with CSS-based animations
 * Changes reveal effect to have a minimum speed of 10 chars / second and max 100 chars / second
 * Scripts in nodes are now parsed before everything else so that they don't interfere with
   toothrot's syntax.
