#: My Story


##: default

###: start

Welcome to (# Toothrot Engine => {"Name?": "explain_toothrot", "examine": "examine_engine"} #)!

(: Visit another node. => another_node :)


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

(>) start


###: lie

Yeah, right. I totally believe you.

(>) start


###: examine_engine

It's a fabulous open source product! Yes!

(<)


###: another_node

This is another node.

(<)

