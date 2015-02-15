var Q = require('q'),
    ChainLoading = require('../ChainLoading.js');

exports.immediateChainDone = function(test) {
    var chain = new ChainLoading(),
        count = 0;

    chain.done(function() {
        count++;
        test.ok(true);
    });

    test.equal(count, 1);
    test.done();
};

exports.singleDeferredDone = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).done(function () {
        count++;
    });

    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.singleDeferredAlways = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).always(function (one) {
        test.equal(one, 1);
        count++;
    });

    d1.resolve(1);
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.singleDeferredAlwaysFail = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).always(function (one) {
        test.equal(one, 1);
        count++;
    });

    d1.reject(1);
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.singleDeferredThen = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).then(function() {
        test.fail();
    },
    function (one) {
        test.equal(one, 1);
        count++;
    });

    chain.then(function() {
        test.fail();
    },
    function (undef) {
        test.equal(undef, undefined);
        count++;
    });

    d1.reject(1);
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.singleDeferredThens = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0,
        f1, f2;

    f1 = function(one) {
        test.equal(one, 1);
        count++;
    };
    f2 = function(one) {
        test.equal(one, 1);
        count++;
    };

    chain.push(d1.promise).then([f1, f2]);

    d1.resolve(1);
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.twoDeferredsOnePushAlreadyDone = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer();

    d1.resolve();
    d2.resolve();

    chain.push(d1.promise, d2.promise).done(function () {
        test.done();
    }).fail(function() {
        test.fail();
    });
};

exports.singleDeferredFail = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).fail(chain.bind(function(one) {
        test.equal(one, 1);
        count++;
    }));
    chain.fail(function(one) {
        test.equal(one, undefined);
        count++;
    });

    d1.reject(1);
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.singleDeferredDoneAdd = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.done(function() {
        count++;
    });
    chain.add(d1.promise).done(function() {
        count++;
    }).fail(function () {
        test.fail();
    });

    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.twoDeferrdsOrderedResolve = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.push(d1.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    }).fail(function() {
        test.fail();
    });

    chain.push(d2.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    }).fail(function () {
        test.fail();
    });

    d1.resolve(1);
    d2.resolve(1);
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    });
};

exports.twoDeferredsBackwardsResolve = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.push(d1.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    }).fail(function () {
        test.fail();
    });

    chain.push(d2.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    }).fail(function () {
        test.fail();
    });

    d2.resolve(1);
    d1.resolve(1);
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    });
};

exports.twoDeferredsFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.push(d1.promise).fail(function() {
        test.equal(order++, 0);
    }).fail(function () {
        test.equal(order++, 1);
    });

    chain.push(d2.promise).done(function() {
        test.fail();
    }).fail(function() {
        test.fail();
    });

    d2.resolve();
    d1.reject();
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    });
};

exports.twoDeferredsPreFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        c;
    d1.reject();

    //q calls the fail in a nextTick so put this before the nextTick callback
    chain.push(d1.promise).fail(function() {
        test.equal(order++, 0);
    }).fail(function() {
        test.equal(order++, 1);
    });
    process.nextTick(function() {
        c = chain.push(d2.promise).done(function() {
            test.fail();
        }).fail(function() {
            test.fail();
        });
        //make sure we aren't leaking memory
        if (c.callbacks != null && c.callbacks.length > 0) {
            test.fail();
        }

        d2.resolve();
        process.nextTick(function() {
            test.equal(order, 2);
            test.done();
        });
    });
};

exports.twoDeferredsOneIgnoredFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1.promise).done(function() {
        test.fail();
    }).fail(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    });

    chain.push(d2.promise).done(function() {
        test.equal(order++, 1);
    });

    d1.reject(1);
    d2.resolve();
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    });
};

exports.threeDeferredsWithDone = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain.done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1.promise).done(function() {
        test.equal(order++, 1);
    });

    chain.done(function() {
        test.equal(order++, 2);
    }, true);

    chain.push(d2.promise).done(function() {
        test.equal(order++, 3);
    });

    chain.push(d3.promise).done(function() {
        test.equal(order++, 4);
    });

    d1.resolve();
    d3.resolve();
    d2.resolve();
    process.nextTick(function() {
        test.equal(order, 5);
        test.done();
    });
};

exports.threeDeferredsOneFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1.promise).done(function() {
        test.fail();
    }).fail(function() {
        test.equal(order++, 0);
    });

    chain.push(d2.promise).done(function() {
        test.equal(order++, 1);
    });

    chain.push(d3.promise).done(function() {
        test.equal(order++, 2);
    });

    d2.resolve();
    d1.reject();
    d3.resolve();
    process.nextTick(function() {
        test.equal(order, 3);
        test.done();
    });
};

exports.fiveDeferredsWithInnerAdds = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer(),
        d4 = Q.defer(),
        d5 = Q.defer();

    chain.add(d1.promise).done(function() {
        test.equal(order, 0);

        chain.push(d5.promise).done(function() {
            order++;
            test.equal(order, 2);
        });

    });

    chain.add(d2.promise).done(function() {
        test.equal(order, 0);
        chain.add(d4.promise).done(function() {
            test.equal(order, 2);
        });
    });

    chain.push(d3.promise).done(function() {
        order++;
        test.equal(order, 1);
    });

    d5.resolve();
    d3.resolve();
    d1.resolve();
    d2.resolve();
    d4.resolve();
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    })
};

exports.threeDeferredsOneAddFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain.fail(function() {
        test.equal(order, 0);
    });

    chain.addIgnoreFail(d1.promise).done(function() {
        test.fail();
    }).fail(function() {
        test.equal(order, 0);
    });

    chain.push(d2.promise).done(function() {
        order++;
        test.equal(order, 1);
    });

    chain.push(d3.promise).done(function() {
        order++;
        test.equal(order, 2);
    });

    d1.reject();
    d2.resolve();
    d3.resolve();
    process.nextTick(function() {
        test.equal(order, 2);
        test.done();
    });
};

exports.chainCeption = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        order = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain2.push(d2.promise);
    chain2.done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1.promise).done(function() {
        test.equal(order++, 1);
    });
    chain.push(chain2);
    chain.done(function() {
        test.equal(order++, 2);
    });
    chain.push(d3.promise).done(function() {
        test.equal(order++, 3);
    });
    chain.fail(function() {
        test.fail();
    });

    d2.resolve();
    d3.resolve();
    d1.resolve();
    process.nextTick(function() {
        test.equal(order, 4);
        test.done();
    })
};

exports.chainCeptionFail = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        count = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain2.fail(function() {
        count++;
    });
    chain2.push(d2.promise);

    chain.push(d1.promise);
    chain.push(chain2);
    chain.done(function() {
        test.fail();
    });
    chain.push(d3.promise).done(function() {
        test.fail();
    });
    chain.fail(function() {
        count++;
    });

    d2.reject();
    d3.resolve();
    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.chainCeptionIgnoreFail = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        count = 0,
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain2.fail(function() {
        count++;
    });
    chain2.push(d2.promise);

    chain.push(d1.promise);
    chain.pushIgnoreFail(chain2);
    chain.done(function() {
        count++;
    });
    chain.push(d3.promise).done(function() {
        count++;
    });
    chain.fail(function() {
        test.fail();
    });

    d2.reject();
    d3.resolve();
    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 3);
        test.done();
    });
};

exports.singleFailAfterCallback = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        count = 0;

    chain.push(d1.promise).fail(function() {
        count++;
    });

    d1.reject();
    chain.fail(function() {
        count++;
    });
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.bindBeforeAfterCompleted = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        order = 0;

    chain.push(d2.promise).done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1.promise).done(function() {
        test.equal(order++, 1);
    });

    d1.promise.done(chain.bind(function() {
        test.equal(order++, 2);
    }));
    d1.resolve();
    d1.promise.done(chain.bind(function() {
        test.equal(order++, 3);
    }));
    d2.resolve();
    d1.promise.done(chain.bind(function() {
        test.equal(order++, 4);
    }));
    process.nextTick(function() {
        test.equal(order, 5);
        test.done();
    });
};

exports.pushAfterCompleted = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        order = 0;

    chain.push(d1.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    });

    chain.push(d2.promise).done(function() {
        test.equal(order++, 1);
    });

    d1.resolve(1);
    chain.push(d1.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 2);
    });
    chain.done(function() {
        test.equal(order++, 3);
    });
    d2.resolve();
    process.nextTick(function() {
        test.equal(order, 4);
        test.done();
    });
};

exports.completedBeforeAdded = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        order = 0;

    d1.resolve(1);
    chain.push(d2.promise).done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1.promise).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    });

    d2.resolve();
    chain.done(function() {
        test.equal(order++, 2);
    });
    process.nextTick(function() {
        test.equal(order, 3);
        test.done();
    });
};

exports.forkMe = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer(),
        order = 0, chain2;

    chain.push(d2.promise).done(function() {
        test.equal(order++, 0);
    });

    chain2 = chain.fork();
    chain2.push(d1.promise).done(function() {
        test.equal(order++, 2);
    });

    //this is a separate chain now so its technically dependant on the order of the resolve
    chain.push(d3.promise).done(function() {
        test.equal(order++, 1);
    });
    chain.push(chain2);
    chain.done(function() {
        test.equal(order++, 3);
    });

    d2.resolve();
    d3.resolve();
    //since Q calls all the callbacks in a nextTick we need to kinda control how they're resolved blah
    process.nextTick(function() {
        d1.resolve();
        process.nextTick(function() {
            test.equal(order, 4);
            test.done();
        });
    });
};

exports.storeApplyArgs = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        _this = this;

    chain.push(d1.promise).done(chain.storeArgs);
    chain.push(d2.promise).done(chain.applyArgs(function(one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(_this, this);
        test.done();
    }, this));

    d2.resolve(2);
    d1.resolve(1);
};

exports.storeApplyArgsBackwards = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        _this = this;

    chain.push(d1.promise).done(chain.storeArgs);
    chain.push(d2.promise).done(chain.applyArgs(function (one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(_this, this);
        test.done();
    }, this));

    d1.resolve(1);
    d2.resolve(2);
};

exports.onlyApplyArgs = function (test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        _this = this;

    chain.push(d1.promise).done(chain.applyArgs(function (one) {
        test.equal(one, 1);
        test.equal(_this, this);
        test.done();
    }, this));

    d1.resolve(1);
};

exports.storeApplyArgsFail = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.pushIgnoreFail(d1.promise).fail(chain.storeArgs(1));
    chain.push(d2.promise).done(chain.applyArgs(function(one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.done();
    }));

    d2.resolve(2);
    d1.reject();
};

exports.storeApplyArgsCurryDone = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer();

    chain.push(d1.promise).done(chain.storeArgs(0)).done(chain.storeArgs);
    chain.done(chain.storeArgs(2));
    chain.done(chain.applyArgs(function(zero, one, two) {
        test.equal(zero, 0);
        test.equal(one, 1);
        test.equal(two, 2);
        test.done();
    }));

    d1.resolve(1);
};

exports.storeApplyArgsStupidDone = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer();

    //we do NOT support currying for storeArgs
    chain.push(d1.promise).done(chain.storeArgs(1));
    chain.done(chain.applyArgs(function(one, undef) {
        test.equal(one, 1);
        test.equal(undef, undefined);
        test.done();
    }));

    d1.resolve(2);
};

exports.storeApplyArgsCurryTwoDfds = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer();

    chain.push(d1.promise).done(chain.storeArgs);
    chain.push(d2.promise).done(chain.storeArgs);

    chain.done(chain.applyArgs(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.done();
    }, null, 3));

    d2.resolve(2);
    d1.resolve(1);
};

exports.storeApplyArgsCurryTwoDfdsAlreadyDone = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer();

    d2.resolve(2);

    chain.push(d1.promise).done(chain.storeArgs);
    chain.push(d2.promise).done(chain.storeArgs);

    chain.done(chain.applyArgs(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.done();
    }, null, 3));

    d1.resolve(1);
};

exports.threeDeferredsOnePush = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain.push(d1.promise, d2.promise, d3.promise).done(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.done();
    });

    d1.resolve(1);
    d3.resolve(3);
    d2.resolve(2);
};

exports.threeDeferredsOneFailed = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    chain.push(d1.promise, d2.promise, d3.promise).done(function() {
        test.fail();
    }).fail(function() {
        test.done();
    });

    d3.resolve();
    d1.resolve();
    d2.reject();
};

exports.deferredsOneFailedChainFail = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        count = 0;

    chain.push(d1.promise, d2.promise).done(function() {
        test.fail();
    }).fail(function () {
        count++;
    });

    chain.fail(function() {
        count++;
    });

    d1.resolve();
    d2.reject();
    process.nextTick(function() {
        test.equal(count, 2);
        test.done();
    });
};

exports.state = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        d3 = Q.defer();

    test.equal(chain.state(), 'pending');

    chain.push(d3.promise);
    d3.resolve();


    process.nextTick(function() {
        test.equal(chain.state(), 'resolved');

        chain.push(d1.promise);

        test.equal(chain.state(), 'pending');

        chain.push(d2.promise);
        d2.reject();

        process.nextTick(function() {
            test.equal(chain.state(), 'rejected');

            d1.resolve();
            process.nextTick(function() {
                test.equal(chain.state(), 'rejected');
                test.done();
            });
        });
    });
};

exports.singleDeferredPromiseDone = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1.promise);
    promise.done(function() {
        count++;
    });

    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.twoDeferredsPromiseDone = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        d2 = Q.defer(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1.promise);
    promise.done(function() {
        test.equal(count, 0);
        count++;
    });

    chain.push(d2.promise);
    promise.done(function() {
        test.equal(count, 1);
        count++;
    });

    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 1);

        d2.resolve();
        process.nextTick(function() {
            test.equal(count, 2);
            test.done();
        });
    });
};

exports.singleDeferredPromiseAlways = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1.promise);
    promise.always(function() {
        count++;
    });

    d1.resolve();
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.singleDeferredPromiseThen = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1.promise);
    promise.then(function() {
        test.fail();
    }, function() {
        count++;
    });

    d1.reject();
    process.nextTick(function() {
        test.equal(count, 1);
        test.done();
    });
};

exports.singleDeferredPromiseState = function(test) {
    var chain = new ChainLoading(),
        d1 = Q.defer(),
        promise = chain.promise();

    chain.push(d1.promise);

    d1.resolve();
    process.nextTick(function() {
        test.equal(promise.state(), 'resolved');
        test.done();
    });
};