# Changelog

## 1.5.0 (2016-09-29)

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
