var $ = require('jquery-deferred'),
    ChainLoading = require("./ChainLoading.js");

var chain = new ChainLoading(),
    d1 = new $.Deferred(),
    d2 = new $.Deferred(),
    d3 = new $.Deferred();
//level 1
chain.done(function() {
    console.log(0);
});

// level 2
chain.push(d1).done(function(c) {
    console.log(c);
}).fail(function() {
    console.log("1 failed");
});

//level 3
chain.push(d2).done(function(c) {
    console.log(c);
}).fail(function() {
    console.log("2 failed");
});

chain.done(function(c) {
    console.log(3);
}, true);


//level 4
chain.push(d3).done(function(c) {
    console.log(c);
}).fail(function() {
    console.log("4 failed");
});

d3.resolve(4);
d2.resolve(2);
d1.resolve(1);

/**
Will produce:

0
1
2
2
3

no matter what order the deferreds resolve in
**/