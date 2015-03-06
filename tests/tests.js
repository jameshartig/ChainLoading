var $ = require('jquery-deferred'),
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
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).done(function () {
        count++;
    });

    d1.resolve();
    test.equal(count, 1);
    test.done();
};

exports.singleDeferredAlways = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).always(function (one) {
        test.equal(one, 1);
        count++;
    });

    d1.resolve(1);
    test.equal(count, 1);
    test.done();
};

exports.singleDeferredTwoAlways = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).always(function(one) {
        test.equal(one, 1);
        count++;
    }, function(one) {
        test.equal(one, 1);
        count++;
    });

    d1.resolve(1);
    test.equal(count, 2);
    test.done();
};

exports.singleDeferredAlwaysFail = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).always(function (one) {
        test.equal(one, 1);
        count++;
    });

    d1.reject(1);
    test.equal(count, 1);
    test.done();
};

exports.singleDeferredThen = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).then(function() {
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
    test.equal(count, 2);
    test.done();
};

exports.singleDeferredThens = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
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

    chain.push(d1).then([f1, f2]);

    d1.resolve(1);
    test.equal(count, 2);
    test.done();
};

exports.twoDeferredsOnePushAlreadyDone = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    d1.resolve();
    d2.resolve();

    chain.push(d1, d2).done(function () {
        test.done();
    }).fail(function() {
        test.fail();
    });
};

exports.singleDeferredDoneArgs = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        finished = false;

    chain.push(d1).done(function (one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        finished = true;
    }).fail(function() {
        test.fail();
    });

    d1.resolve(1, 2, 3);
    test.ok(finished);
    test.done();
};

exports.singleDeferredFail = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).fail(chain.bind(function(one) {
        test.equal(one, 1);
        count++;
    }));
    chain.fail(function(one) {
        test.equal(one, undefined);
        count++;
    });

    d1.reject(1);
    test.equal(count, 2);
    test.done();
};

exports.singleDeferredDoneAdd = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.done(function() {
        count++;
    });
    chain.add(d1).done(function() {
        count++;
    }).fail(function () {
        test.fail();
    });

    d1.resolve();
    test.equal(count, 2);
    test.done();
};

exports.twoDeferrdsOrderedResolve = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    }).fail(function() {
        test.fail();
    });

    chain.push(d2).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    }).fail(function () {
        test.fail();
    });

    d1.resolve(1);
    d2.resolve(1);
    test.equal(order, 2);
    test.done();
};

exports.twoDeferredsBackwardsResolve = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    }).fail(function () {
        test.fail();
    });

    chain.push(d2).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    }).fail(function () {
        test.fail();
    });

    d2.resolve(1);
    d1.resolve(1);
    test.equal(order, 2);
    test.done();
};

exports.twoDeferredsFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1).fail(function() {
        test.equal(order++, 0);
    }).fail(function () {
        test.equal(order++, 1);
    });

    chain.push(d2).done(function() {
        test.fail();
    }).fail(function() {
        test.fail();
    });

    d2.resolve();
    d1.reject();
    test.equal(order, 2);
    test.done();
};

exports.twoDeferredsPreFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        c;
    d1.reject();

    chain.push(d1).fail(function() {
        test.equal(order++, 0);
    }).fail(function () {
        test.equal(order++, 1);
    });

    c = chain.push(d2).always(function() {
        test.fail();
    });
    //make sure we aren't leaking memory
    if (c.callbacks != null && c.callbacks.length > 0) {
        test.fail();
    }
    c = chain.add(d2).always(function() {
        test.fail();
    });
    //make sure we aren't leaking memory
    if (c.callbacks != null && c.callbacks.length > 0) {
        test.fail();
    }

    d2.resolve();
    test.equal(order, 2);
    test.done();
};

exports.twoDeferredsOneIgnoredFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1).done(function() {
        test.fail();
    }).fail(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    });

    chain.push(d2).done(function() {
        test.equal(order++, 1);
    });

    d1.reject(1);
    d2.resolve();
    test.equal(order, 2);
    test.done();
};

exports.threeDeferredsWithDone = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1).done(function() {
        test.equal(order++, 1);
    });

    chain.done(function() {
        test.equal(order++, 2);
    }, true);

    chain.push(d2).done(function() {
        test.equal(order++, 3);
    });

    chain.push(d3).done(function() {
        test.equal(order++, 4);
    });

    d1.resolve();
    d3.resolve();
    d2.resolve();
    test.equal(order, 5);
    test.done();
};

exports.threeDeferredsOneFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1).done(function() {
        test.fail();
    }).fail(function() {
        test.equal(order++, 0);
    });

    chain.push(d2).done(function() {
        test.equal(order++, 1);
    });

    chain.push(d3).done(function() {
        test.equal(order++, 2);
    });

    d2.resolve();
    d1.reject();
    d3.resolve();
    test.equal(order, 3);
    test.done();
};

exports.fiveDeferredsWithInnerAdds = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred(),
        d4 = new $.Deferred(),
        d5 = new $.Deferred();

    chain.add(d1).done(function() {
        test.equal(order, 0);

        chain.push(d5).done(function() {
            order++;
            test.equal(order, 2);
        });

    });

    chain.add(d2).done(function() {
        test.equal(order, 0);
        chain.add(d4).done(function() {
            test.equal(order, 2);
        });
    });

    chain.push(d3).done(function() {
        order++;
        test.equal(order, 1);
    });

    d5.resolve();
    d3.resolve();
    d1.resolve();
    d2.resolve();
    d4.resolve();
    test.equal(order, 2);
    test.done();
};

exports.threeDeferredsOneAddFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.fail(function() {
        test.equal(order, 0);
    });

    chain.addIgnoreFail(d1).done(function() {
        test.fail();
    }).fail(function() {
        test.equal(order, 0);
    });

    chain.push(d2).done(function() {
        order++;
        test.equal(order, 1);
    });

    chain.push(d3).done(function() {
        order++;
        test.equal(order, 2);
    });

    d1.reject();
    d2.resolve();
    d3.resolve();
    test.equal(order, 2);
    test.done();
};

exports.chainCeption = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain2.push(d2);
    chain2.done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1).done(function() {
        test.equal(order++, 1);
    });
    chain.push(chain2);
    chain.done(function() {
        test.equal(order++, 2);
    });
    chain.push(d3).done(function() {
        test.equal(order++, 3);
    });
    chain.fail(function() {
        test.fail();
    });

    d2.resolve();
    d3.resolve();
    d1.resolve();
    test.equal(order, 4);
    test.done();
};

exports.chainCeptionFail = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        count = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain2.fail(function() {
        count++;
    });
    chain2.push(d2);

    chain.push(d1);
    chain.push(chain2);
    chain.done(function() {
        test.fail();
    });
    chain.push(d3).done(function() {
        test.fail();
    });
    chain.fail(function() {
        count++;
    });

    d2.reject();
    d3.resolve();
    d1.resolve();
    test.equal(count, 2);
    test.done();
};

exports.chainCeptionIgnoreFail = function(test) {
    var chain = new ChainLoading(),
        chain2 = new ChainLoading(),
        count = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain2.fail(function() {
        count++;
    });
    chain2.push(d2);

    chain.push(d1);
    chain.pushIgnoreFail(chain2);
    chain.done(function() {
        count++;
    });
    chain.push(d3).done(function() {
        count++;
    });
    chain.fail(function() {
        test.fail();
    });

    d2.reject();
    d3.resolve();
    d1.resolve();
    test.equal(count, 3);
    test.done();
};

exports.singleFailAfterCallback = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1).fail(function() {
        count++;
    });

    d1.reject();
    chain.fail(function() {
        count++;
    });
    test.equal(count, 2);
    test.done();
};

exports.bindBeforeAfterCompleted = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        order = 0;


    chain.push(d2).done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1).done(function() {
        test.equal(order++, 1);
    });

    d1.done(chain.bind(function() {
        test.equal(order++, 2);
    }));
    d1.resolve();
    d1.done(chain.bind(function() {
        test.equal(order++, 3);
    }));
    d2.resolve();
    d1.done(chain.bind(function() {
        test.equal(order++, 4);
    }));
    test.equal(order, 5);
    test.done();
};

exports.pushAfterCompleted = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        order = 0;

    chain.push(d1).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    });

    chain.push(d2).done(function() {
        test.equal(order++, 1);
    });

    d1.resolve(1);
    chain.push(d1).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 2);
    });
    chain.done(function() {
        test.equal(order++, 3);
    });
    d2.resolve();
    test.equal(order, 4);
    test.done();
};

exports.completedBeforeAdded = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        order = 0;

    d1.resolve(1);
    chain.push(d2).done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1).done(function(one) {
        test.equal(one, 1);
        test.equal(order++, 1);
    });

    d2.resolve();
    chain.done(function() {
        test.equal(order++, 2);
    });
    test.equal(order, 3);
    test.done();
};

exports.forkMe = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred(),
        order = 0, chain2;

    chain.push(d2).done(function() {
        test.equal(order++, 0);
    });

    chain2 = chain.fork();
    chain2.push(d1).done(function() {
        test.equal(order++, 2);
    });

    //this is a separate chain now so its technically dependant on the order of the resolve
    chain.push(d3).done(function() {
        test.equal(order++, 1);
    });
    chain.push(chain2);
    chain.done(function() {
        test.equal(order++, 3);
    });

    d2.resolve();
    d3.resolve();
    d1.resolve();
    test.equal(order, 4);
    test.done();
};

exports.storeApplyArgs = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        _this = this;

    chain.push(d1).done(chain.storeArgs);
    chain.push(d2).done(chain.applyArgs(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.equal(_this, this);
        test.done();
    }, this));

    d2.resolve(2, 3);
    d1.resolve(1);
};

exports.storeApplyArgsBackwards = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        _this = this;

    chain.push(d1).done(chain.storeArgs);
    chain.push(d2).done(chain.applyArgs(function (one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.equal(_this, this);
        test.done();
    }, this));

    d1.resolve(1);
    d2.resolve(2, 3);
};

exports.onlyApplyArgs = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        _this = this;

    chain.push(d1).done(chain.applyArgs(function (one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(_this, this);
        test.done();
    }, this));

    d1.resolve(1, 2);
};

exports.storeApplyArgsFail = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.pushIgnoreFail(d1).fail(chain.storeArgs(1));
    chain.push(d2).done(chain.applyArgs(function(one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.done();
    }));

    d2.resolve(2);
    d1.reject();
};

exports.storeApplyArgsCurryDone = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred();

    chain.push(d1).done(chain.storeArgs(0)).done(chain.storeArgs);
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
        d1 = new $.Deferred();

    //we do NOT support currying for storeArgs
    chain.push(d1).done(chain.storeArgs(1));
    chain.done(chain.applyArgs(function(one, undef) {
        test.equal(one, 1);
        test.equal(undef, undefined);
        test.done();
    }));

    d1.resolve(2);
};

exports.storeApplyArgsCurryTwoDfds = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1).done(chain.storeArgs);
    chain.push(d2).done(chain.storeArgs);

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
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    d2.resolve(2);

    chain.push(d1).done(chain.storeArgs);
    chain.push(d2).done(chain.storeArgs);

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
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.push(d1, d2, d3).done(function(one, two, three, four, five) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.equal(four, 4);
        test.equal(five, 5);
        test.done();
    });

    d1.resolve(1);
    d3.resolve(5);
    d2.resolve(2, 3, 4);
};

exports.threeDeferredsOneFailed = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.push(d1, d2, d3).done(function() {
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
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred(),
        count = 0;

    chain.push(d1, d2).done(function() {
        test.fail();
    }).fail(function () {
        count++;
    });

    chain.push(d3).always(function() {
        test.fail();
    });

    chain.fail(function() {
        count++;
    });

    d3.resolve();
    d1.resolve();
    d2.reject();
    test.equal(count, 2);
    test.done();
};

exports.state = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    test.equal(chain.state(), 'pending');

    chain.push(d3);
    d3.resolve();

    test.equal(chain.state(), 'resolved');

    chain.push(d1);

    test.equal(chain.state(), 'pending');

    chain.push(d2);
    d2.reject();

    test.equal(chain.state(), 'rejected');

    d1.resolve();

    test.equal(chain.state(), 'rejected');
    test.done();
};

exports.singleDeferredPromiseDone = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1);
    promise.done(function() {
        count++;
    });

    d1.resolve();
    test.equal(count, 1);
    test.done();
};

exports.twoDeferredsPromiseDone = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1);
    promise.done(function() {
        test.equal(count, 0);
        count++;
    });

    chain.push(d2);
    promise.done(function() {
        test.equal(count, 1);
        count++;
    });

    d1.resolve();
    test.equal(count, 1);

    d2.resolve();
    test.equal(count, 2);
    test.done();
};

exports.singleDeferredPromiseAlways = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1);
    promise.always(function() {
        count++;
    });

    d1.resolve();
    test.equal(count, 1);
    test.done();
};

exports.singleDeferredPromiseThen = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        promise = chain.promise(),
        count = 0;

    chain.push(d1);
    promise.then(function() {
        test.fail();
    }, function() {
        count++;
    });

    d1.reject();
    test.equal(count, 1);
    test.done();
};

exports.singleDeferredPromiseState = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        promise = chain.promise();

    chain.push(d1);

    d1.resolve();
    test.equal(promise.state(), 'resolved');
    test.done();
};
