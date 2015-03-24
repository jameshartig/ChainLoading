var $ = require('jquery-deferred'),
    ChainLoading = require('../ChainLoading.js');


exports.singleDone = function(test) {
    var chain = new ChainLoading(),
        count = 0;

    chain.done(function() {
        count++;
        test.ok(true);
    });

    test.equal(count, 1);
    test.done();
};

exports.singleDoneBind = function(test) {
    var chain = new ChainLoading(),
        count = 0;

    chain.done(chain.bind(function() {
        count++;
        test.ok(true);
    }));

    test.equal(count, 1);
    test.done();
};

exports.singleDoneBindContext = function(test) {
    var chain = new ChainLoading(),
        count = 0,
        context = this;

    chain.done(chain.bind(function() {
        count++;
        test.ok(true);
        test.equal(context, this);
    }, this));

    test.equal(count, 1);
    test.done();
};


exports.singleDoneBindWithCurry = function(test) {
    var chain = new ChainLoading();

    chain.done(chain.bind(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.done();
    }, null, 1, 2, 3));
};

exports.singleFail = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.push(d1.fail(chain.bind(function(one) {
        test.equal(one, 1);
        count++;
    })));
    chain.fail(function(one) {
        test.equal(one, 1);
        count++;
    });

    d1.reject(1);
    test.equal(count, 2);
    test.done();
};

exports.singleDoneAdd = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        count = 0;

    chain.done(function() {
        count++;
        test.ok(true);
    });
    chain.add(d1.done(chain.bind(function() {
        count++;
        test.ok(true);
    })));

    d1.resolve();
    test.equal(count, 2);
    test.done();
};

exports.twoDfds = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    d1.resolve();
    d2.resolve();
    test.equal(order, 2);
    test.done();
};

exports.twoDfdsBackwards = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    d2.resolve();
    d1.resolve();
    test.equal(order, 2);
    test.done();
};

exports.twoDfdsFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1.fail(chain.bind(function(one) {
        test.equal(one, 1);
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.fail();
    })));

    d2.resolve();
    d1.reject(1);
    test.equal(order, 1);
    test.done();
};

exports.twoDfdsTimeout = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    d2.resolve();
    d1.resolve();
    test.equal(order, 2);
    test.done();
};

exports.twoDfdsOneFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1.done(chain.bind(function() {
        test.fail();
    })).fail(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    d1.reject();
    d2.resolve();
    test.equal(order, 2);
    test.done();
};

exports.threeDfdsWithDone = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.done(function() {
        test.equal(order++, 0);
    });

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    chain.done(function() {
        test.equal(order++, 2);
    }, true);

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 3);
    })));

    chain.push(d3.done(chain.bind(function() {
        test.equal(order++, 4);
    })));

    d1.resolve();
    d3.resolve();
    d2.resolve();
    test.equal(order, 5);
    test.done();
};

exports.threeDfdsOneFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.fail(function() {
        test.fail();
    });

    chain.pushIgnoreFail(d1.done(chain.bind(function() {
        test.fail();
    })).fail(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    chain.push(d3.done(chain.bind(function() {
        test.equal(order++, 2);
    })));

    d2.resolve();
    d1.reject();
    d3.resolve();
    test.equal(order, 3);
    test.done();
};

exports.fiveDfdsWithInnerAdds = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred(),
        d4 = new $.Deferred(),
        d5 = new $.Deferred();

    chain.add(d1.done(chain.bind(function() {
        test.equal(order, 0);

        chain.push(d5.done(chain.bind(function() {
            order++;
            test.equal(order, 2);
        })));

    })));

    chain.add(d2.done(chain.bind(function() {
        test.equal(order, 0);
        chain.add(d4.done(chain.bind(function() {
            test.equal(order, 2);
        })));
    })));

    chain.push(d3.done(chain.bind(function() {
        order++;
        test.equal(order, 1);
    })));

    d5.resolve();
    d3.resolve();
    d1.resolve();
    d2.resolve();
    d4.resolve();
    test.equal(order, 2);
    test.done();
};

exports.threeDfdsOneAddFail = function(test) {
    var chain = new ChainLoading(),
        order = 0,
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        d3 = new $.Deferred();

    chain.fail(function() {
        test.equal(order, 0);
    });

    chain.addIgnoreFail(d1.done(chain.bind(function() {
        test.fail();
    })).fail(chain.bind(function() {
        test.equal(order, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        order++;
        test.equal(order, 1);
    })));

    chain.push(d3.done(chain.bind(function() {
        order++;
        test.equal(order, 2);
    })));

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

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 1);
    })));
    chain.push(chain2);
    chain.done(function() {
        test.equal(order++, 2);
    });
    chain.push(d3.done(chain.bind(function() {
        test.equal(order++, 3);
    })));
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
    chain.push(d3.done(chain.bind(function() {
        test.fail();
    })));
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
    chain.push(d3.done(chain.bind(function() {
        count++;
    })));
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

    chain.push(d1.fail(chain.bind(function() {
        count++;
    })));

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


    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

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

/*

THIS IS BROKEN AND A KNOWN CAVEAT

exports.pushAfterCompleted = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        order = 0;

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 1);
    })));

    d1.resolve();
    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 2);
    })));
    chain.done(function() {
        test.equal(order++, 3);
    });
    d2.resolve();
    test.equal(order, 4);
    test.done();
};

*/

//if we fix the above caveat then this test will break (unless magic) because it's utilizing the caveat
exports.doneAfterCompletedWithCaveat = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        order = 0;

    chain.push(d1.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 2);
    })));

    d1.resolve();
    d1.done(chain.bind(function() {
        test.equal(order++, 1);
    }));
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

    d1.resolve();
    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain.push(d1);
    d1.done(chain.bind(function() {
        test.equal(order++, 1);
    }));

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

    chain.push(d2.done(chain.bind(function() {
        test.equal(order++, 0);
    })));

    chain2 = chain.fork();
    chain2.push(d1.done(chain2.bind(function() {
        test.equal(order++, 2);
    })));

    //this is a separate chain now so its technically dependant on the order of the resolve
    chain.push(d3.done(chain.bind(function() {
        test.equal(order++, 1);
    })));
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

    chain.push(d1.done(chain.storeArgs));
    chain.push(d2.done(chain.applyArgs(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.equal(_this, this);
        test.done();
    }, this)));

    d2.resolve(2, 3);
    d1.resolve(1);
};

exports.storeApplyArgsBackwards = function (test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred(),
        d2 = new $.Deferred(),
        _this = this;

    chain.push(d1.done(chain.storeArgs));
    chain.push(d2.done(chain.applyArgs(function (one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.equal(_this, this);
        test.done();
    }, this)));

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

    chain.pushIgnoreFail(d1.fail(chain.storeArgs(1)));
    chain.push(d2.done(chain.applyArgs(function(one, two) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.done();
    })));

    d2.resolve(2);
    d1.reject();
};

exports.storeApplyArgsCurryDone = function(test) {
    var chain = new ChainLoading(),
        d1 = new $.Deferred();

    chain.push(d1.done(chain.storeArgs));
    chain.done(chain.storeArgs(2));
    chain.done(chain.applyArgs(function(one, two) {
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
    chain.push(d1.done(chain.storeArgs(1)));
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

    chain.push(d1.done(chain.storeArgs));
    chain.push(d2.done(chain.storeArgs));

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

    chain.push(d1.done(chain.storeArgs));
    chain.push(d2.done(chain.storeArgs));

    chain.done(chain.applyArgs(function(one, two, three) {
        test.equal(one, 1);
        test.equal(two, 2);
        test.equal(three, 3);
        test.done();
    }, null, 3));

    d1.resolve(1);
};
