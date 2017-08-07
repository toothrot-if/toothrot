# My Story

```json @hierarchy
{
    "item": [],
    "drop_zone": [],
    "container": ["item", "drop_zone"],
    "room": ["drop_zone"]
}
```


## default

### start

(#) background: "url('images/muffin-dot-dat.png') center/cover"

```js @where
JSON.stringify($._lastNodes, null, 4);
```

Welcome to [Toothrot Engine](#toothrot_engine)!

`@where`.

From here, you can go to [the storage room](#storage_room).

(@) Play an example game => street


### street

In front of your house
---------------------------------

(#) tags: ["room"]
(#) contains: ["engine_dealer"]

```js @entry
_.event(_.oneOf(
    "A car drives past.",
    "An elderly lady pushes a shopping cart across the street.",
    "Far away, the siren of an ambulance blares.",
    "A group of teenagers passes by.",
    "",
    "",
    ""
));
```

This is the front of your house. It's not the best neighborhood, but you got used to
it over the years. A door leads [inside](#enter_house).

(@) Wait => wait
(@) Use an item => inventory


### enter_house

You unlock the door and enter your house, leaving the sounds of the city behind.

(>) kitchen


### exit_house

You exit the house and close the door behind you.

(>) street


### wait

Time passes.

(<)


### engine_dealer

```js @brief
if (_.self().isnt("seen_sword") && _.node().contains("sword")) {
    _.self().be("seen_sword");
    _.event('Suspicious guy: "What the heck are you doing with that sword?"');
}
else {
    _.event(
        _.oneOf(
            'Suspicious guy: "Hey you!"',
            'Suspicious guy: "Pssst... need an engine?"',
            'Suspicious guy: "Come here, I got something for you!"',
            "The suspicious guy clears his throat.",
            "",
            ""
        )
    );
}

"A {suspicious guy} in a long coat stands in the shadows. He's staring at you."
```

A man wearing the cliché attire of a private detective, a long coat and a black fedora.

(<)


### toothrot_engine

(#) background: "url('images/coldmountain.png') center/cover"

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

(<) drop_zone


### drop_sword

```js @entry
_.node("sword").dontBe("taken").moveTo(_.last("drop_zone"));
```

You drop the sword.

(<) drop_zone


### storage_room

```js @where
JSON.stringify($._lastNodes, null, 4);
```

Storage Room
------------

(#) tags: ["room"]
(#) contains: ["chest"]
(#) background: "url('images/cloudsinthedesert.png') center/cover"

Just some boring storage room. A door leads to the [kitchen](#kitchen).

`@where`

(@) Use an item => inventory

(>) start


### kitchen

Kitchen
-------

(#) tags: ["room"]

Your kitchen. Nothing much, but it gets the job done.

One door leads to a [storage room](#storage_room),
another one to the [street](#exit_house) outside.

(@) Use an item => inventory


### chest

(#) tags: ["container"]
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


### inventory

Your Inventory
--------------

(#) flags: ["item_list"]

```js @empty
_.self().isEmpty() ? "You poor soul don't own a thing." : "You're currently carrying:"
```

`@empty`

(<) room
