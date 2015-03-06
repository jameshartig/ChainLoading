(function(window) {
    var CompletedMap = window.WeakMap,
        slice = [].slice, //from: http://stackoverflow.com/questions/120804/difference-between-array-slice-and-array-slice/121302#121302
        indexOf = [].indexOf,
        noopThis = function() { return this; },
        undefined;

    //polyfill for WeakMap (we only need set/get)
    if (CompletedMap === undefined) {
        CompletedMap = function() {
            var arr = [];
            this.has = function(k) {
                var i = -1;
                if (k != null) { //only search if they actually gave us something to search for
                    i = arr.length - 1;
                }
                while (i >= 0) {
                    if (arr[i] === k) {
                        break;
                    }
                    i--;
                }
                return i > -1;
            };
            this.set = function(k) {
                arr.push(k);
            };
        };
    }

    if (indexOf === undefined) {
        indexOf = function(search, fromIndex) {
            var len = this.length,
                i = +fromIndex || 0;
            if (len === 0 || i >= len) {
                return -1;
            }
            //apparently passing Infinity for fromIndex means we should start at 0?
            if (!isFinite(i)) {
                i = 0;
            }
            if (i < 0) {
                i = Math.max(len - Math.abs(i), 0);
            }
            while (i < len) {
                if (this[i] === search) {
                    return i;
                }
                i++;
            }
            return -1;
        };
    }


    function LevelContainer(chain, ready) {
        this.chain = chain;
        this.ready = ready || false; //ready means that we should call any callbacks as soon as they finish
        this.completed = true; //completed means we have finished ALL deferreds assigned to us (by default we have finished them all)
        this.state = '';
        this.dfds = [];
        this.failCallbacks = [];
        this.nextLevel = null;
        this.prevLevel = null;
    }
    LevelContainer.prototype.newGroup = function(dfds, stateOnFail, globalCallbacks, completedDeferreds) {
        if (this.state === '') { //if we haven't finished yet and we just added a new group, we're NOT complete
            this.completed = false;
        }
        var o = {s: 0, r: this.ready},
            level = this,
            group;
        this.dfds.push(o);
        group = new GroupedDfd(dfds, function(s, g) {
            o.g = g; //store the group on the object, so we can call complete on it
            o.s = 1;

            switch (s) {
                case 'resolved':
                    //don't overwrite with resolved if we already got a state
                    if (level.state === '') {
                        level.state = 'resolved';
                    }
                    break;
                case 'rejected':
                    //don't overwrite stopped
                    if (level.state !== 'stopped') {
                        level.state = stateOnFail;
                    }
                    break;
            }
            level.complete();
        }, globalCallbacks, completedDeferreds);

        return group;
    };
    LevelContainer.prototype.requireDeferreds = function(dfds, globalCallbacks, completedDeferreds) {
        return this.newGroup(dfds, 'rejected', globalCallbacks, completedDeferreds).promise;
    };
    LevelContainer.prototype.optionalDeferreds = function(dfds, globalCallbacks, completedDeferreds) {
        return this.newGroup(dfds, 'ignored', globalCallbacks, completedDeferreds).promise;
    };
    LevelContainer.prototype.addFailCallback = function(f) {
        //if we already failed, immediately call
        //README states that fail() is called whenever previous levels failed
        if (this.state === 'ignored' || this.state === 'rejected') {
            f.call(this.chain);
        } else if (!this.completed || this.state === '') {
            this.failCallbacks.push(f);
        }
    };
    LevelContainer.prototype.removeFailCallback = function(f) {
        var index = indexOf.call(this.failCallbacks, f);
        if (index !== -1) {
            this.failCallbacks.splice(index, 1);
        }
    };
    LevelContainer.prototype.complete = function() {
        if (this.ready !== true) {
            return;
        }
        //if the state is "ignored" then we need to reject the deferreds still attached to this level
        //the normalizedState returns "resolved" since to *everything else* its resolved
        var normalizedState = this.state === 'ignored' ? 'rejected' : this.normalizedState(),
            i;
        for (i = 0; i < this.dfds.length; i++) {
            if (typeof this.dfds[i] === 'function') {
                this.dfds[i]();
            } else {
                this.dfds[i].r = true; //ready
                if (this.dfds[i].s === 0) { //not ready yet so we can't continue
                    break; //todo: if we don't want to maintain order in a level then make this continue or something
                }
                this.dfds[i].g.complete(normalizedState);
            }
            this.dfds.splice(i, 1);
            i--;
        }
        //if there's a nextLevel then we should start completing that next
        if (this.dfds.length === 0) {
            //if we're rejected then we cannot continue and call the next level, instead just call failCallbacks
            if (this.state === 'rejected') {
                this.completeFailed();
                return;
            }
            this.cleanup();
            if (this.state === 'stopped') {
                return;
            }
            if (this.nextLevel !== null) {
                this.nextLevel.ready = true;
                this.nextLevel.complete();
            }
            this.cleanupLevelRefs();
        }
    };
    LevelContainer.prototype.completeFailed = function() {
        for (var i = 0; i < this.failCallbacks.length; i++) {
            this.failCallbacks[i].call(this.chain);
            this.failCallbacks.splice(i, 1);
            i--;
        }

        this.cleanup();
        if (this.nextLevel !== null) {
            this.nextLevel.completeFailed();
        }
        this.cleanupLevelRefs();
    };
    LevelContainer.prototype.cleanup = function(cleanupNext) {
        var i, l;
        for (i = 0; i < this.dfds.length; i++) {
            this.dfds[i].r = false; //not ready
            this.dfds.splice(i, 1);
            i--;
        }
        this.completed = true;
        //just empty the array
        for (i = 0, l = this.failCallbacks.length; i < l; i++) {
            this.failCallbacks.shift();
        }
    };
    LevelContainer.prototype.cleanupLevelRefs = function() {
        this.nextLevel = null;
        this.prevLevel = null;
    };
    LevelContainer.prototype.normalizedState = function() {
        //if the state is 'stopped' then it should actually be 'rejected'
        if (this.state === 'stopped') {
            return 'rejected';
        }
        if (this.state === 'ignored') {
            return 'resolved';
        }
        //state is '' when its pending
        return this.state || 'pending';
    };
    LevelContainer.prototype.stop = function(cleanupNext) {
        //don't let this complete
        this.ready = false;
        this.state = 'stopped';
        this.cleanup();
        if (this.nextLevel !== null) {
            this.nextLevel.stop();
        }
        this.cleanupLevelRefs();
    };

    //todo: remove globalCallbacks and completedDeferreds
    function GroupedDfd(deferreds, onComplete, globalCallbacks, completedDeferreds) {
        this.args = [];
        this.promise = new GroupedDfdPromise();
        var resp = this,
            promise = this.promise,
            allDfds = [],
            complete = false,
            canResolve = false;

        function callOnComplete(state) {
            if (complete) {
                return;
            }
            complete = true;
            //make sure allDfds is empty
            allDfds.length = 0;
            onComplete(state, resp);
        }

        function onResolve() {
            //loop through the deferreds and build the response args array in order
            //we must wait until canResolve is true otherwise we're still looping through allDfds so we can't splice
            for (var i = 0; i < allDfds.length && canResolve && !complete; i++) {
                //once we hit one that isn't resolved then break
                if (allDfds[i].s === 0) {
                    break;
                }
                if (allDfds[i].args !== null) {
                    resp.args.push.apply(resp.args, allDfds[i].args);
                }
                allDfds.splice(i, 1);
                i--;
            }
            if (allDfds.length === 0) {
                callOnComplete('resolved');
            }
        }

        //create the objects that hold each deferred, its state and the args it returned
        var i, l;
        for (i = 0, l = deferreds.length; i < l; i++) {
            if (deferreds[i] === undefined) {
                throw new Error('Undefined sent to push/add. Did you forget to return a deferred?');
            }
            //s of 0 means not done and s of 1 means done
            allDfds.push({d: deferreds[i], s: 0, args: null});
        }
        //we need to loop a second time since a deferred could IMMEDATELY resolve
        for (i = 0, l = allDfds.length; i < l && !complete; i++) {
            if (typeof allDfds[i].d === 'function') {
                allDfds[i].s = 1;
                this.promise.done(allDfds[i].d);
                continue;
            }
            if (typeof allDfds[i].d.then !== 'function') {
                throw new Error('Invalid deferred sent to chain');
            }

            //add handlers to the deferred so we can store the state it resolved as and the args it returned
            (function(obj) {
                obj.d.then(function() {
                    if (obj.s !== 0) {
                        return;
                    }

                    obj.args = slice.call(arguments);
                    obj.s = 1;

                    var dfd = this;
                    promise.done(function() {
                        completedDeferreds.set(dfd);
                        //temporary for backwards-compat
                        for (var j = 0; j < globalCallbacks.length; j++) {
                            if (dfd === globalCallbacks[j].d) {
                                promise.done(globalCallbacks[j].func);
                                globalCallbacks.splice(j, 1);
                                j--;
                            }
                        }
                    });

                    onResolve();
                }, function() {
                    if (obj.s !== 0) {
                        return;
                    }
                    //overwrite the args on the response since we failed, we want the failed stuff to get called with the failed args
                    resp.args = slice.call(arguments);
                    obj.s = 1;

                    var dfd = this;
                    promise.fail(function() {
                        completedDeferreds.set(dfd);
                        //temporary for backwards-compat
                        for (var j = 0; j < globalCallbacks.length; j++) {
                            if (dfd === globalCallbacks[j].d) {
                                promise.fail(globalCallbacks[j].func);
                                globalCallbacks.splice(j, 1);
                                j--;
                            }
                        }
                    });

                    //if we failed, we can immediately stop and bail
                    callOnComplete('rejected');
                });
            }(allDfds[i]));
        }
        //start allowing resolving now
        canResolve = true;

        //if there was only functions or deferreds already resolved, immediately resolve (only if we didn't already resolve)
        //a resolve might've be called but we had to postpone till we were done looping
        onResolve();
    }
    GroupedDfd.prototype.complete = function(s) {
        var callbacks = this.promise.callbacks,
            i;
        if (this.promise.s === 'pending') {
            this.promise.s = s;
            this.promise.args = this.args;
        }
        for (i = 0; i < callbacks.length; i++) {
            if (callbacks[i].s === this.promise.s) {
                callbacks[i].f.apply(this.promise.ctx, this.promise.args);
            }
            callbacks.splice(i, 1);
            i--;
        }
    };

    function GroupedDfdPromise(context) {
        this.ctx = context || this;
        this.s = 'pending';
        this.args = null;
        this.callbacks = [];
    }
    GroupedDfdPromise.prototype.done = function() {
        var i, l;
        if (this.s === 'resolved') {
            for (i = 0, l = arguments.length; i < l; i++) {
                arguments[i].apply(this.ctx, this.args);
            }
        } else if (this.s === 'pending') {
            for (i = 0, l = arguments.length; i < l; i++) {
                if (typeof arguments[i] !== 'function') {
                    throw new Error('Invalid function sent to done ' + (typeof arguments[i]));
                }
                this.callbacks.push({s: 'resolved', f: arguments[i]});
            }
        } //else its already rejected
        return this;
    };
    GroupedDfdPromise.prototype.then = function(doneCallbacks, failCallbacks) {
        if (typeof doneCallbacks === 'function') {
            this.done(doneCallbacks);
        } else if (doneCallbacks != null) {
            this.done.apply(this, doneCallbacks);
        }
        if (typeof failCallbacks === 'function') {
            this.fail(failCallbacks);
        } else if (failCallbacks != null) {
            this.fail.apply(this, failCallbacks);
        }
        return this;
    };
    GroupedDfdPromise.prototype.fail = function() {
        var i, l;
        if (this.s === 'rejected') {
            for (i = 0, l = arguments.length; i < l; i++) {
                arguments[i].apply(this.ctx, this.args);
            }
        } else if (this.s === 'pending') {
            for (i = 0, l = arguments.length; i < l; i++) {
                if (typeof arguments[i] !== 'function') {
                    throw new Error('Invalid function sent to fail ' + (typeof arguments[i]));
                }
                this.callbacks.push({s: 'rejected', f: arguments[i]});
            }
        } //else its already resolved
        return this;
    };
    GroupedDfdPromise.prototype['catch'] = GroupedDfdPromise.prototype.fail;
    GroupedDfdPromise.prototype.always = function() {
        var args = slice.call(arguments);
        return this.fail.apply(this, args).done.apply(this, args);
    };
    //todo: implement other dfd methods
    GroupedDfdPromise.prototype.state = function() {
        return this.s;
    };

    //an empty promise will never be resolved
    function EmptyPromise() {}
    for (var m in GroupedDfdPromise.prototype) {
        if (GroupedDfdPromise.prototype.hasOwnProperty(m) && typeof GroupedDfdPromise.prototype[m] === 'function') {
            EmptyPromise.prototype[m] = noopThis;
        }
    }
    //state is a special case
    EmptyPromise.prototype.state = function() {
        return 'pending';
    };

    function ChainLoading() {
        var self = this,
            deferredCallbacks = [],
            completedDeferreds = new CompletedMap(), //deferreds that have completed, used for binds that happened after a push/add
            globalFailCallbacks,
            storedArgs, currentLevel,
            promise;

        function levelFailed() {
            if (globalFailCallbacks === undefined) {
                return;
            }
            for (var i = 0; i < globalFailCallbacks.length; i++) {
                globalFailCallbacks[i].call(self);
                globalFailCallbacks.splice(i, 1);
                i--;
            }
        }

        function newLevel() {
            var hasCurrentLevel = currentLevel !== undefined,
                newLevel = new LevelContainer(self, (!hasCurrentLevel || currentLevel.completed));
            if (globalFailCallbacks !== undefined) {
                newLevel.addFailCallback(levelFailed);
            }
            if (hasCurrentLevel) {
                currentLevel.nextLevel = newLevel;
                newLevel.prevLevel = currentLevel;
                //we only need to have the levelFailed on the LAST level, we don't need it on all the levels in between
                currentLevel.removeFailCallback(levelFailed);
            }
            currentLevel = newLevel; //advance level
            return newLevel;
        }

        /**
         * Exposed methods
         */

        function push(func, args) {
            //if we've already failed then just short-circuit
            if (currentLevel !== undefined && currentLevel.normalizedState() === 'rejected') {
                return new EmptyPromise();
            }
            newLevel();
            return currentLevel[func](args, deferredCallbacks, completedDeferreds);
        }
        function add(func, args) {
            if (currentLevel === undefined) {
                newLevel();
            } else if (currentLevel.normalizedState() === 'rejected') {
                return new EmptyPromise();
            }
            return currentLevel[func](args, deferredCallbacks, completedDeferreds);
        }

        //adds deferreds/functions to the next level
        this.push = this.next = function() {
            //each argument is a deferred or function
            return push('requireDeferreds', slice.call(arguments));
        };

        //adds deferreds to the same level and doesn't increase it (useful for parallel operations where return order doens't matter)
        this.add = function() {
            //each argument is a deferred or function
            return add('requireDeferreds', slice.call(arguments));
        };

        //adds deferreds to the next level (index)
        //if any of the deferreds fail it'll keep going through the levels
        this.pushIgnoreFail = this.nextIgnoreFail = function() {
            return push('optionalDeferreds', slice.call(arguments));
        };

        //adds deferreds to the same level and doesn't increase it (useful for parallel operations where return order doens't matter)
        //if any of the deferreds fail it'll keep going through the levels
        this.addIgnoreFail = function() {
            //each argument is a deferred or function
            return add('optionalDeferreds', slice.call(arguments));
        };

        this.stop = function() {
            var levelToStop = currentLevel;
            if (levelToStop === undefined) {
                levelToStop = newLevel();
            } else {
                //find the first level that we still have around
                while (levelToStop.prevLevel !== null && (levelToStop = levelToStop.prevLevel)) {}
            }
            levelToStop.stop();
            return this;
        };

        this.fail = this['catch'] = function(func) {
            if (currentLevel === undefined) {
                //todo: if there's a better way to do this, that'd be awesome
                if (globalFailCallbacks === undefined) {
                    globalFailCallbacks = [];
                }
                globalFailCallbacks.push(func);
            } else {
                currentLevel.addFailCallback(func);
            }
            return this;
        };

        var internalBind = function(func, context, curried) {
            return function() {
                var f;
                //building function all the time so we don't duplicate code (only 5-10% slower http://jsperf.com/concat-vs-length)
                if (curried === undefined) { //can't just check curried.length since it might be storedArgs which gets larger later
                    f = function() {
                        func.apply(context, slice.call(arguments));
                    };
                } else {
                    f = function() {
                        func.apply(context, curried.concat(slice.call(arguments)));

                        //easy way of emptying array (from: http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript/1234337#1234337)
                        curried.length = 0;
                    };
                }
                //this is the actual deferred unless someone did chain.done(chain.bind(...))
                if (this === self || (this instanceof GroupedDfdPromise) || completedDeferreds.has(this)) {
                    f.apply(this, slice.call(arguments));
                } else {
                    deferredCallbacks.push({d: this, func: f, s: this.state()});
                }
            };
        };

        //emulate bind but we need the context from the deferred. This is REQUIRED for each deferred's callbacks
        this.bind = function(func, context) {
            if (arguments.length < 3) {
                return internalBind(func, context);
            } else {
                return internalBind(func, context, slice.call(arguments, 2));
            }
        };

        //this is basically bind but will apply the storedArgs as if they were curried
        this.applyArgs = function(func, context) {
            if (arguments.length < 3) { //optimize for usual case
                //make sure stored args isn't null so we can pass a reference to internalBind
                if (storedArgs === undefined) storedArgs = [];
                return internalBind(func, context, storedArgs);
            } else {
                var curried = slice.call(arguments, 2);
                return function() {
                    //this is also clearing out storedArgs, unless its undefined which means that storeArgs was never called?
                    var args = (storedArgs || []).splice(0, storedArgs.length).concat(curried).concat(slice.call(arguments));
                    internalBind(func, context, args).call(this);
                };
            }
        };

        this.storeArgs = function() {
            //this is the actual deferred unless someone did chain.done(chain.storeArgs(...))
            var args = slice.call(arguments),
                storeArgs = function() {
                    //if storedArgs is null then they either haven't called applyArgs or they passed >3 arguments
                    if (storedArgs === undefined) storedArgs = [];
                    //cannot use concat on storedArgs since we need ref to be the same for internalBind to work correctly
                    storedArgs.push.apply(storedArgs, args);
                };
            if (this === self) {
                //if they did chain.push(chain.storeArgs(stuff)) we want to just put that into the chain and it call it when ready
                return storeArgs;
            } else if ((this instanceof GroupedDfdPromise) || completedDeferreds.has(this)) {
                //if a grouped promise was completed or if the deferred was already completed
                storeArgs();
            } else {
                deferredCallbacks.push({d: this, func: storeArgs, s: this.state()});
            }
        };

        this.state = function() {
            if (currentLevel === undefined) {
                return 'pending';
            }
            return currentLevel.normalizedState();
        };

        this.promise = function() {
            if (promise === undefined) {
                var tinyBind = function(func, context) {
                    //right now all the things we're binding below require less than 3 args
                    return function(oneArg, twoArg, threeArg) {
                        return func.call(context, oneArg, twoArg, threeArg);
                    };
                };
                promise = {
                    state: this.state, //no bind needed
                    done: tinyBind(this.done, this),
                    fail: tinyBind(this.fail, this),
                    always: tinyBind(this.always, this),
                    then: tinyBind(this.then, this)
                };
            }
            return promise;
        };
    }

    ChainLoading.prototype.done = ChainLoading.prototype.after = function(func, runAtCurrent) {
        if (runAtCurrent) {
            this.add(func);
        } else {
            this.push(func);
        }
        return this;
    };

    ChainLoading.prototype.then = function(doneCallbacks, failCallbacks) {
        var i, l;
        if (typeof doneCallbacks === 'function') {
            this.done(doneCallbacks);
        } else if (doneCallbacks != null) {
            for (i = 0, l = doneCallbacks.length; i < l; i++) {
                this.done(doneCallbacks[i]);
            }
        }
        if (typeof failCallbacks === 'function') {
            this.fail(failCallbacks);
        } else if (failCallbacks != null) {
            for (i = 0, l = failCallbacks.length; i < l; i++) {
                this.fail(failCallbacks[i]);
            }
        }
        return this;
    };

    ChainLoading.prototype.always = function(func) {
        //fast-case
        if (arguments.length === 1) {
            return this.fail(func).done(func);
        }
        var funcs = slice.call(arguments);
        return this.fail.apply(this, funcs).done.apply(this, funcs);
    };

    //makes a new chain that's initially based off the of the current level of this chain
    ChainLoading.prototype.fork = function() {
        var newChain = new ChainLoading();
        newChain.push(this);
        return newChain;
    };

    if (typeof module !== "undefined") {
        module.exports = ChainLoading;
    } else {
        window.ChainLoading = ChainLoading;

        if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
            define('ChainLoading', function() { return ChainLoading; });
        }
    }
}(this));
