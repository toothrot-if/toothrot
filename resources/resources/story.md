# My Story


## default

### start

```js @entry
$.foo = "bar";
console.log("start@entry called!");
```

```js @where
_.self().is("open") ? "the bright room" : "the smelly room"
```

Welcome to [Toothrot Engine](#toothrot_engine)!

The variable `foo` contains: `$foo`

Let's go to `@where`. Or go to [the storage room](#storage_room)?

[Visit another node.](#another_node)


### toothrot_engine

An engine for developing text-based games. It has a weird name.

(@) Explain name   => explain_toothrot
(@) Examine engine => examine_engine

(>) start


### sword

(#) tags: ["item"]

```js @brief
_.node("chest").contains("sword") ?
    "The chest contains a {shiny sword}." :
    (
        _.node().is("item_list") ?
        "{A shiny sword}" :
        "There's a {shiny sword} on the floor."
    )
```

A very shiny, very *dangerous* sword-type thingy.

(@) !taken ??? Take => take_sword
(@) taken  ??? Drop => drop_sword

(<)

### take_sword

```js @entry
_.node("sword").be("taken").moveTo("inventory");
```

You take that shiny-ass sword.

(<) room


### drop_sword

```js @entry
_.node("sword").dontBe("taken").moveTo(_.last("room"));
```

You drop the sword.

(<) room


### storage_room

(#) tags: ["room"]
(#) contains: ["chest"]

Just some boring storage room. A [door](#kitchen) leads to the kitchen.

(@) Use an item => inventory


### kitchen

A rather boring kitchen. A [door](#storage_room) leads to a storage room.


### chest

(#) tags: ["item"]
(#) flags: ["sneaky", "closed"]
(#) contains: ["sword"]

```js @brief
"There's a sturdy {wooden chest} in the corner."
```

A sturdy wooden chest.

(@) closed  ??? Open  => open_chest
(@) !closed ??? Close => close_chest

(<) room


### open_chest

```js @entry
_.node("chest").dontBe("closed").dontBeSneaky()
```

You open the chest.

(<)


### close_chest

```js @entry
_.node("chest").be("closed").beSneaky()
```

You close the chest.

(<)


### explain_toothrot

The name "Toothrot" is a homage to the character Herman Toothrot from the famous
adventure game "Monkey Island."
***
Wait - you've played that game, right?
***
Surely you have.
***
Everyone has played it.
***
Including you...
***
Right?

(#) timeout: 10000
(@) YES! I swear! => lie
(@) Look! There's a three-headed monkey! => has_played


### has_played

Good answer. You may continue.

(>) toothrot_engine


### lie

Yeah, right. I totally believe you.

(>) toothrot_engine


### examine_engine

It's a fabulous open source product! Yes!

(<)


### another_node

This is another node.

(<)


### inventory

(#) flags: ["item_list"]

```js @empty
_.self().isEmpty() ? "You poor soul don't own a thing." : "You're currently carrying:"
```

`@empty`

(<) room
