function ChainLoading() {
    var currentLevel = 0, //the current level we are on to maintain the deferred order
        lastCompletedLevel = 0, //the last index to be resolved/rejected
        levelTodos = {0: []}, //pending deferreds that already were resolved/rejected where the keys are the index
        deferredCallbacks = [], //callback objects for each deferred
        failedLevel = Infinity, //the level at which we have failed. everything AFTER this level will be rejected
        onFailCallbacks = [], //callbacks that are called when ANY deferred fails
        completedDeferreds = [], //deferreds that have completed, used for binds that happened after a push/add
        self = this;

    /**
     * Private functions
     */

    //process is run after each deferred finishes and attempts to complete the current and sequential levels
    function checkLevelAndContinue(level) {
        if (failedLevel < level) { return; }

        if (lastCompletedLevel >= (level - 1)) { //the deferred before this already completed or we already are past this
            do {
                //complete the current deferred and then continue trying to complete ones directly after this
                if (!completeLevel(level)) { //look ahead to see if we can complete the next deferred
                    break; //this level is NOT complete yet so don't continue
                }
            } while (level++ < currentLevel);
            level = Math.max(0, level - 1); //we didn't complete this level so set it back to the last one
            lastCompletedLevel = Math.max(lastCompletedLevel, level);
        }
    }

    //attempt to complete this level, if it has all the todos done then it will return true
    function completeLevel(level) {
        if (!levelTodos[level]) {
            return false;
        }
        //nothing to do
        if (!levelTodos[level].length) {
            return true;
        }

        //need to keep checking the length because something could be being added to levelTodos[level]
        var todo;
        while (todo = levelTodos[level][0]) {
            levelTodos[level].shift();
            if (typeof todo === "function") {
                todo.call(self);
            } else {
                //we have a deferred, complete it
                completeDeferred(todo);
            }
        }
        return (todo !== null); //if todo is null, then we return false because its a pending deferred
    }

    //finds all functions for this deferred and calls them (if appropriate); then removes them
    function completeDeferred(deferredObj, cleanUp) {
        var deferred = deferredObj.deferred,
            functionsToCall = [];
        if (!cleanUp) {
            //if we actually have a completed deferred, then we need to add it here so bind functions later still know its already done
            completedDeferreds.push(deferred);
        }
        for (var i = 0; i < deferredCallbacks.length; i++) {
            if (deferredCallbacks[i].deferred === deferred) {

                //only call callback if the state applies
                if (!cleanUp) {
                    if (deferredCallbacks[i].state === deferredObj.state) {
                        functionsToCall.push(deferredCallbacks[i].func);
                    }
                }

                //always remove the other callbacks for this deferrred
                deferredCallbacks.splice(i, 1);
                i--;
            }
        }
        //call functions at end in case they would have caused an infinite loop
        for (i = 0; i < functionsToCall.length; i++) {
            functionsToCall[i].apply(deferred, deferredObj.args);
        }
    }

    //delete all callbacks and any functions from the level
    function cleanupLevel(level) {
        var todo;
        while (todo = levelTodos[level][0]) {
            levelTodos[level].shift();
            if (typeof todo !== "function") {
                //we have a deferred, complete it
                completeDeferred(todo, true);
            }
        }
        levelTodos[level] = [];
    }

    //calls all the onFailCallbacks
    function onFail(level, ignore) {
        if (!ignore) {
            failedLevel = Math.min(failedLevel, level); //make sure we save where we failed so we know which deferreds later we can call
        }
        for (var i = 0, l = onFailCallbacks.length; i < l; i++) {
            onFailCallbacks[i].call(self);
        }
        onFailCallbacks = [];

        if (ignore) { //don't clean up previous levels
            return;
        }

        //clean up levels after this one in case we have pending deferreds or callbacks=
        while (level++ < currentLevel) {
            cleanupLevel(level);
        }
    }

    function listenOnDeferred(d, myLevel, ignoreFails) {
        d.done(function() { //"this" is the original deferred
            levelTodos[myLevel].pop(); //remove saved spot

            if (myLevel <= failedLevel) { //if something BEFORE this deferred failed, then we can't resolve this one
                levelTodos[myLevel].unshift({deferred: this, state: "resolved", args: Array.prototype.slice.call(arguments)}); //add a todo for this level
            }
            checkLevelAndContinue(myLevel);
        });
        d.fail(function() { //"this" is the original deferred
            onFail(myLevel, ignoreFails); //make sure to immediately call failed callbacks

            levelTodos[myLevel].pop(); //remove saved spot

            if (myLevel <= failedLevel) {
                levelTodos[myLevel].unshift({deferred: this, state: "rejected", args: Array.prototype.slice.call(arguments)});  //add a todo for this level
            }

            checkLevelAndContinue(myLevel);
        });
    }

    //sets up listeners for the deferred at the current level
    function setupDeferreds(deferreds, ignoreFails) {
        for (var i = 0, l = deferreds.length, d; i < l; i++) {
            if (deferreds[i] === undefined) {
                continue;
            }
            d = deferreds[i];
            if (currentLevel === lastCompletedLevel) { //add() was called for the current level and this level was already completed
                lastCompletedLevel--;
            }

            levelTodos[currentLevel].push(null); //save a "spot" in the todo list so we know we still have something pending
            listenOnDeferred(d, currentLevel, ignoreFails);
        }
    }

    /**
     * Exposed methods
     */

    //adds deferreds to the next level (index)
    this.push = this.next = function() {
        currentLevel++; //advance currentLevel
        levelTodos[currentLevel] = []; //prepare the todo array
        setupDeferreds(Array.prototype.slice.call(arguments)); //each argument is a deferred
        checkLevelAndContinue(currentLevel);
    };

    //adds deferreds to the same level and doesn't increase it (useful for parallel operations where return order doens't matter)
    this.add = function() {
        if (currentLevel === 0) { //fix for calling add before anything else
            currentLevel = 1;
            levelTodos[currentLevel] = [];
        }
        setupDeferreds(Array.prototype.slice.call(arguments)); //each argument is a deferred
        return this;
    };

    //adds deferreds to the next level (index)
    //if any of the deferreds fail it'll keep going through the levels
    this.pushIgnoreFail = this.nextIgnoreFail = function() {
        currentLevel++; //advance currentLevel
        levelTodos[currentLevel] = []; //prepare the todo array
        setupDeferreds(Array.prototype.slice.call(arguments), true); //each argument is a deferred
        checkLevelAndContinue(currentLevel);
        return this;
    };

    //adds deferreds to the same level and doesn't increase it (useful for parallel operations where return order doens't matter)
    //if any of the deferreds fail it'll keep going through the levels
    this.addIgnoreFail = function() {
        if (currentLevel === 0) { //fix for calling add before anything else
            currentLevel = 1;
            levelTodos[currentLevel] = [];
        }
        setupDeferreds(Array.prototype.slice.call(arguments), true); //each argument is a deferred
        checkLevelAndContinue(currentLevel);
        return this;
    };

    //emulate bind but we need the context from the deferred. This is REQUIRED for each deferred's callbacks
    this.bind = function(func, context) {
        var curried = Array.prototype.slice.call(arguments, 2);
        return function() {
            //in case someone did chain.done(chain.bind(...)) or
            //the deferred is already complete
            if (this === self || completedDeferreds.indexOf(this) > -1) {
                func.apply(context, curried.concat(Array.prototype.slice.call(arguments)));
            } else {
                //this is the actual deferred
                var f = function() {
                    func.apply(context, curried.concat(Array.prototype.slice.call(arguments)));
                };
                deferredCallbacks.push({deferred: this, func: f, state: this.state()});
            }
        };
    };

    //allow functions to be run at the next level
    this.done = this.after = function(func, runAtCurrent) {
        var initialLevel = currentLevel,
            localCurrentLevel;
        if (!runAtCurrent) {
            currentLevel++; //advance currentLevel
            levelTodos[currentLevel] = []; //prepare the next to do array
        }
        // make sure if the done advances the currentLevel we have what it was before that happened
        localCurrentLevel = currentLevel;
        //only immediately call func if we never failed, failed in the future, or the current level failed and runAtCurrent is true
        if (failedLevel > initialLevel || (runAtCurrent && failedLevel === initialLevel)) {
            if (lastCompletedLevel < initialLevel) {
                levelTodos[currentLevel].unshift(func);
            } else {
                func.call(self);
                if (!runAtCurrent) {
                    checkLevelAndContinue(localCurrentLevel);
                }
            }
        }
        return this;
    };
    //fail is called when ANY of the deferreds fail no matter when this was called
    this.fail = function(func) {
        if (failedLevel < Infinity) {
            func.call(self);
        } else {
            onFailCallbacks.push(func);
        }
        return this;
    };

    this.always = function(func) {
        return this.fail(func).done(func);
    };
}

module.exports = ChainLoading;