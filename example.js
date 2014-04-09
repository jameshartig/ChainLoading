var chain = new ChainLoading(),
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

/**
Will produce:

0
1
2
2
3

no matter what order the deferreds resolve in
**/