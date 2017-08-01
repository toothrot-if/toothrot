#: My Story


##: default

###: start

Welcome to (: Toothrot Engine => toothrot_engine :)!

(: Visit another node. => another_node :)


###: toothrot_engine

An engine for developing text-based games, with a weird name.

(@) Explain name => explain_toothrot
(@) Examine engine => examine_engine

(>) start


###: explain_toothrot

The name "Toothrot" is a homage to the character Herman Toothrot from the famous
adventure game "Monkey Island."
(~~~)
Wait - you've played that game, right?
(~~~)
Surely you have.
(~~~)
Everyone has played it.
(~~~)
Including you...
(~~~)
Right?

(#) timeout: 10000
(@) YES! I swear! => lie
(@) Look! There's a three-headed monkey! => has_played


###: has_played

Good answer. You may continue.

(>) toothrot_engine


###: lie

Yeah, right. I totally believe you.

(>) toothrot_engine


###: examine_engine

It's a fabulous open source product! Yes!

(<)


###: another_node

This is another node.

(<)

