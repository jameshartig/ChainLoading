(function(window) {
    var CompletedMap = window.WeakMap,
        slice = [].slice, //from: http://stackoverflow.com/questions/120804/difference-between-array-slice-and-array-slice/121302#121302
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

    function LevelContainer(chain, active) {
        this.chain = chain;
        this.active = active || false; //active means that we should call any callbacks as soon as they finish
        this.completed = true; //completed means we have finished ALL deferreds assigned to us (by default we have finished them all)
        this.state = '';
        this.dfds = [];
        this.failCallbacks = [];
        this.nextLevel = null;
    }
    LevelContainer.prototype.newGroup = function(dfds, onComplete, globalCallbacks, completedDeferreds) {
        if (this.state === '') { //if we haven't finished yet and we just added a new group, we're NOT complete
            this.completed = false;
        }
        var o = {s: 0, r: this.active},
            group;
        this.dfds.push(o);
        group = new GroupedDfd(this.chain, dfds, function(s, g) {
            //success
            o.g = g; //store the group on the object, so we can call complete on it
            o.s = 1;
            onComplete(s, o.r);
        }, globalCallbacks, completedDeferreds);

        return group;
    };
    LevelContainer.prototype.requireDeferreds = function(dfds, globalCallbacks, completedDeferreds) {
        var level = this;
        return this.newGroup(dfds, function(s, ready) {
            switch (s) {
                case 'resolved':
                    if (level.state === '') {
                        level.state = 'resolved';
                    }
                    break;
                case 'rejected':
                    level.state = 'rejected'; //always fail no matter what the current state is
                    break;
            }
            if (ready) { //make sure we've been given clearance to resolve this
                level.complete();
            }
        }, globalCallbacks, completedDeferreds).promise;
    };
    //still required to finish but if they fail, nbd
    LevelContainer.prototype.optionalDeferreds = function(dfds, globalCallbacks, completedDeferreds) {
        var level = this;
        return this.newGroup(dfds, function(s, ready) {
            switch (s) {
                case 'resolved':
                    if (level.state === '') {
                        level.state = 'resolved';
                    }
                    break;
                case 'rejected':
                    level.state = 'ignored';
                    break;
            }
            if (ready) { //make sure we've been given clearance to resolve this
                level.complete();
            }
        }, globalCallbacks, completedDeferreds).promise;
    };
    LevelContainer.prototype.addFailCallback = function(f) {
        //if we already failed, immediately call
        if (this.state === 'ignored' || this.state === 'rejected') {
            f.call(this.chain);
        } else if (!this.completed || this.state === '') {
            this.failCallbacks.push(f);
        }
    };
    LevelContainer.prototype.complete = function() {
        this.active = true;
        for (var i = 0; i < this.dfds.length; i++) {
            if (typeof this.dfds[i] === 'function') {
                this.dfds[i]();
            } else {
                this.dfds[i].r = true; //ready
                if (this.dfds[i].s === 0) { //not active yet so we can't continue
                    break; //todo: if we don't want ot maintain order in a level then make this continue or something
                }
                this.dfds[i].g.complete(this.state);
            }
            this.dfds.splice(i, 1);
            i--;
        }
        if (this.dfds.length === 0) {
            this.completed = true;
        }
        //if there's a nextLevel then we should start completing that next
        if (this.completed === true) {
            if (this.state === 'rejected') {
                this.failed();
                return;
            }
            this.cleanup(true);
            if (this.nextLevel !== null) {
                this.nextLevel.complete();
            }
        }
    };
    LevelContainer.prototype.failed = function() {
        for (var i = 0; i < this.failCallbacks.length; i++) {
            this.failCallbacks[i].call(this.chain);
            this.failCallbacks.splice(i, 1);
            i--;
        }

        this.cleanup(true);
        if (this.nextLevel !== null) {
            this.nextLevel.failed();
        }
    };
    LevelContainer.prototype.cleanup = function(skipNext) {
        var i, l;
        for (i = 0; i < this.dfds.length; i++) {
            this.dfds[i].r = false; //not ready
            this.dfds.splice(i, 1);
            i--;
        }
        //just empty the array
        for (i = 0, l = this.failCallbacks.length; i < l; i++) {
            this.failCallbacks.shift()
        }
        if (this.nextLevel !== null && skipNext !== true) {
            this.nextLevel.cleanup();
        }
    };

    //todo: remove globalCallbacks and completedDeferreds
    function GroupedDfd(chain, deferreds, onComplete, globalCallbacks, completedDeferreds) {
        this.args = [];
        this.promise = new GroupedDfdPromise();
        var resp = this,
            promise = this.promise,
            allDfds = [];

        function onResolve() {
            for (var i = 0; i < allDfds.length; i++) {
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
                onComplete('resolved', resp);
            }
        }

        var i, l;
        for (i = 0, l = deferreds.length; i < l; i++) {
            if (deferreds[i] === undefined) {
                throw Error('Undefined sent to sent. Did you mean to return deferred?');
            }
            allDfds.push({d: deferreds[i], s: 0, args: null});
        }
        //we need to loop a second time since a deferred could IMMEDATELY resolve
        for (i = 0, l = allDfds.length; i < l; i++) {
            if (typeof allDfds[i].d === 'function') {
                allDfds[i].s = 1;
                this.promise.done(allDfds[i].d);
                continue;
            }
            if (typeof allDfds[i].d.then !== 'function') {
                throw Error('Invalid deferred sent to chain');
            }

            (function(obj) {
                var onFail;
                obj.d.then(function() {
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
                });

                onFail = function() {
                    //overwrite the args on the response since we failed, we want the failed stuff to get called with the failed args
                    resp.args = slice.call(arguments);

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
                    onComplete('rejected', resp);
                };
                if (obj.d.catch !== undefined) {
                    obj.d.catch(onFail);
                } else {
                    obj.d.fail(onFail);
                }
            }(allDfds[i]));
        }

        //if there was only functions or deferreds already resolved, immediately resolve (only if we didn't already resolve)
        if (allDfds.length > 0) {
            onResolve();
        }
    }
    GroupedDfd.prototype.complete = function(s) {
        var callbacks = this.promise.callbacks,
            i;
        if (this.promise.s === null) {
            this.promise.s = s === 'ignored' ? 'rejected' : s;
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
        this.s = null;
        this.args = null;
        this.callbacks = [];
    }
    GroupedDfdPromise.prototype.done = function() {
        var i, l;
        if (this.s === 'resolved') {
            for (i = 0, l = arguments.length; i < l; i++) {
                arguments[i].apply(this.ctx, this.args);
            }
        } else if (this.s === null) {
            for (i = 0, l = arguments.length; i < l; i++) {
                if (typeof arguments[i] !== 'function') {
                    throw Error('Invalid function sent to done ' + (typeof arguments[i]));
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
        } else if (this.s === null) {
            for (i = 0, l = arguments.length; i < l; i++) {
                if (typeof arguments[i] !== 'function') {
                    throw Error('Invalid function sent to fail ' + (typeof arguments[i]));
                }
                this.callbacks.push({s: 'rejected', f: arguments[i]});
            }
        } //else its already resolved
        return this;
    };
    GroupedDfdPromise.prototype.catch = GroupedDfdPromise.prototype.fail;
    GroupedDfdPromise.prototype.always = function() {
        var args = slice.call(arguments);
        return this.fail.apply(this, args).done.apply(this, args);
    };
    //todo: implement other dfd methods
    GroupedDfdPromise.prototype.state = function() {
        return this.s;
    };

    function ChainLoading() {
        var self = this,
            deferredCallbacks = [],
            completedDeferreds = new CompletedMap(), //deferreds that have completed, used for binds that happened after a push/add
            storedArgs = [], //todo: it'd be cool to not make this always be an empty array and initialize it to something else
            globalFailCallbacks = [],
            currentLevel;

        function levelFailed() {
            for (var i = 0; i < globalFailCallbacks.length; i++) {
                globalFailCallbacks[i].call(self);
                globalFailCallbacks.splice(i, 1);
                i--;
            }
        }

        /**
         * Exposed methods
         */

        function push(func, args) {
            var hasCurrentLevel = currentLevel !== undefined,
                newLevel;
            //if we've already failed then just short-circuit
            if (hasCurrentLevel && currentLevel.state === 'rejected') {
                return;
            }
            newLevel = new LevelContainer(self, (!hasCurrentLevel || currentLevel.completed));
            newLevel.addFailCallback(levelFailed); //todo: somehow only add this to the LAST container so it doesn't get called on every level
            if (hasCurrentLevel) {
                currentLevel.nextLevel = newLevel;
            }
            currentLevel = newLevel; //advance level
            return newLevel[func](args, deferredCallbacks, completedDeferreds);
        }
        function add(func, args) {
            if (currentLevel === undefined) {
                currentLevel = new LevelContainer(this, true);
                currentLevel.addFailCallback(levelFailed); //todo: somehow only add this to the LAST container so it doesn't get called on every level
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

        this.done = this.after = this.then = function(func, runAtCurrent) {
            if (runAtCurrent) {
                this.add(func);
            } else {
                this.push(func);
            }
            return this;
        };

        this.then = function(doneCallbacks, failCallbacks) {
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

        this.fail = this.catch = function(func) {
            if (currentLevel === undefined) {
                //global blah
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
            if (arguments.length < 3) {
                //optimize for usual case
                return internalBind(func, context, storedArgs);
            } else {
                var curried = slice.call(arguments, 2);
                return function() {
                    var args = storedArgs.concat(curried).concat(slice.call(arguments));
                    //easy way of emptying array (from: http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript/1234337#1234337)
                    storedArgs.length = 0;
                    internalBind(func, context, args).call(this);
                };
            }
        };

        this.storeArgs = function() {
            //this is the actual deferred unless someone did chain.done(chain.storeArgs(...))
            var args = slice.call(arguments),
                storeArgs = function() {
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

        this.always = function(func) {
            return this.fail(func).done(func);
        };

        //makes a new chain that's initially based off the of the current level of this chain
        this.fork = function() {
            var newChain = new ChainLoading();
            newChain.push(this);
            return newChain;
        };
    }

    if (typeof module !== "undefined") {
        module.exports = ChainLoading;
    } else {
        window.ChainLoading = ChainLoading;

        if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
            define('ChainLoading', function() { return ChainLoading; });
        }
    }
}(this));
