# Toothrot Engine

    DEPRECATION NOTICE: This project is no longer actively maintained.

An engine for creating text-based games.

Toothrot Engine allows you to create interactive fiction, parser-less text adventures or other
text-based games. The games are written in an eye-friendly text-based format (similar to Markdown)
and allow writing your game logic in JavaScript.

To develop games with this engine, basic knowledge of JavaScript and HTML is recommended,
though not required for simple choice-based or hypertext games.

**Please note:** For most people [Toothrot IDE](https://github.com/toothrot-if/toothrot-ide/)
is the better choice for developing Toothrot games.

## Features

 * Markdown-like format for writing games
 * Different modes of interaction:
   * Regular links (like known from Twine)
   * Option menus (like in ChoiceScript or in visual novels)
   * Going to the next node by clicking or pushing a button (like in visual novels)
 * Customizable screen system written in regular HTML and CSS with default screens:
   * Main screen
   * Pause screen
   * Savegame screen
   * Settings screen
 * Savegame system with slots, auto-save and quick save/load
 * Text nodes can also be things in the simple world model, e.g. rooms, items or persons
 * Text nodes can be tagged and put into a hierarchy
 * Text nodes can contain other text nodes
 * Support for mobile devices (and "add to homescreen")
 * Exports games for browsers (works without a web server) or as Windows/Mac/Linux desktop apps
 * Audio support with separate channels for sounds, ambience and music
 * Games playable using the keyboard
 * Games playable with screen readers (experimental)
 * Extensible JavaScript API
 * Speed-adjustable reveal effect for text (like in visual novels)
 * Browser builds support application cache (offline mode) out of the box

## Documentation

The documentation resides in its own repository and can be found
[here](https://github.com/toothrot-if/toothrot-docs/).
