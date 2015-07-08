## Changelog ##

### 1.1.1 ###
* Fixed support for [deferred](https://www.npmjs.com/package/deferred)

### 1.1.0 ###
* fail callbacks now get the arguments passed to failed deferred's reject
* Optimized calling of functions in loops with args arrays

### 1.0.7 ###

* Cleans up internal handler for global fails when new level is created
* Added `chain.stop()`
* Documented and clarified behavior of `chain.state()`
* Removed needless array creation if global fail callbacks are never used
