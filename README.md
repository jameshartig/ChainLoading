#chainLoading#
Allows you to chain together deferreds or functions and control the order at which they call your callbacks. The order is controlled by "levels". You can can have many deferreds or callbacks on each "level".
**The order within in each "level" is NOT guaranteed**, however, each "level" is guaranteed to be called sequentially.

The benefit being that all methods are called immediately and the callbacks are called in the order you want. This can make loading a page that requires multiple API calls much faster since the API calls will happen in parallel.

_If a deferred is rejected, none of the callbacks in levels after it in the chain will be called unless you used one of the *ignore* methods._

--------------------------

## _.chainLoading() ##
Returns a new chainLoading object.

## Prototype methods to add new deferreds to the chain ##
### push(deferred1, ..., deferredn) ###
Allows you to add deferreds to the next "level". All the deferreds passed as arguments will be added to the same level.

**For the deferred's done/fail/always methods, it's imperative that you use the built-in bind() method below for your callbacks!**

### add(deferred1, ..., deferredn) ###
Allows you to add deferreds to the current "level". Remember the order is not guaranteed within a level. This is useful if you don't care about the order for some deferreds and don't want to send them all in one push call.

**For the deferred's done/fail/always methods, it's imperative that you use the built-in bind() method below for your callbacks!**

### bind(func, context, [arg1, ..., argn]) ###
Required method for adding callbacks to the deferreds passed to push/add. Even if you have nothing to bind to, you must use this method to add callbacks.

### pushIgnoreFail(deferred1, ..., deferredn) ###
Same as `push()` except that any failures will be ignored and the chain will continue processing upcoming levels.

### addIgnoreFail(deferred1, ..., deferredn) ###
Same as `add()` except that any failures will be ignored and the chain will continue processing upcoming levels.

## Prototype methods to add callbacks to the chain ##

### after(func, [currentLevel = false]) ###
Adds a function to the next (default) or current level. Useful at the end of all your deferreds for knowing when everything completed.

### done(func, [currentLevel = false]) ###
Alias for `after()`

### fail(func) ###
Func is called whenever ANY of the deferreds on ANY level fail. Useful for knowing if any part of the chain failed.
**You should add a fail callback BEFORE adding any deferreds in the event that those deferreds fail immediately**

--------------------------

## Example ##

~~~
var chain = new chainLoading(),
    d1 = new $.Deferred(),
    d2 = new $.Deferred(),
    d3 = new $.Deferred();
//level 1
chain.done(function() {
    console.log(0);
});

// level 2
chain.push(d1.done(chain.bind(function() {
    console.log(1);
})));

//level 3
chain.push(d2.done(chain.bind(function() {
    console.log(2);
})));

chain.done(function() {
    console.log(2);
}, true);

//level 4
chain.push(d3.done(chain.bind(function() {
    console.log(3);
})));

d1.resolve();
d3.resolve();
d2.resolve();
~~~

Will **ALWAYS** produce in the console:
~~~
0
1
2
2
3
~~~