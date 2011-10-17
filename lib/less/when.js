/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

//
// when.js 0.9.3
//
(function(scope, undef) {

    // No-op function used in function replacement in various
    // places below.
    function noop() {}

    // Use freeze if it exists
    var freeze = Object.freeze || noop;

    // Creates a new, CommonJS compliant, Deferred with fully isolated
    // resolver and promise parts, either or both of which may be given out
    // safely to consumers.
    // The Deferred itself has the full API: resolve, reject, progress, and
    // then. The resolver has resolve, reject, and progress.  The promise
    // only has then.
    function defer() {
        var deferred, promise, resolver, result, listeners, tail,
            _then, _progress, complete;

        _then = function(callback, errback, progback) {
            var d, listener;

            listener = {
                deferred: (d = defer()),
                resolve: callback,
                reject: errback,
                progress: progback
            };

            if(listeners) {
                // Append new listener if linked list already initialized
                tail = tail.next = listener;
            } else {
                // Init linked list
                listeners = tail = listener;
            }

            return d.promise;
        };

        function then(callback, errback, progback) {
            return _then(callback, errback, progback);
        }

        function resolve(val) {
            complete('resolve', val);
        }

        function reject(err) {
            complete('reject', err);
        }

        _progress = function(update) {
            var listener, progress;

            listener = listeners;

            while(listener) {
                progress = listener.progress;
                if(progress) progress(update);
                listener = listener.next;
            }
        };

        function progress(update) {
            _progress(update);
        }

        complete = function(which, val) {
            // Save original _then
            var origThen = _then;

            // Replace _then with one that immediately notifies
            // with the result.
            _then = function newThen(callback, errback) {
                var promise = origThen(callback, errback);
                notify(which);
                return promise;
            };

            // Replace complete so that this Deferred
            // can only be completed once.  Note that this leaves
            // notify() intact so that it can be used in the
            // rewritten _then above.
            // Replace _progress, so that subsequent attempts
            // to issue progress throw.
            complete = _progress = function alreadyCompleted() {
                throw new Error("already completed");
            };

            // Final result of this Deferred.  This is immutable
            result = val;

            // Notify listeners
            notify(which);
        };

        function notify(which) {
            // Traverse all listeners registered directly with this Deferred,
            // also making sure to handle chained thens
            while(listeners) {
                var listener, ldeferred, newResult, handler;

                listener  = listeners;
                ldeferred = listener.deferred;
                listeners = listeners.next;

                handler = listener[which];
                if(handler) {
                    try {
                        newResult = handler(result);

                        if(isPromise(newResult)) {
                            // If the handler returned a promise, chained deferreds
                            // should complete only after that promise does.
                            _chain(newResult, ldeferred);

                        } else {
                            // Complete deferred from chained then()
                            // FIXME: Which is correct?
                            // The first always mutates the chained value, even if it is undefined
                            // The second will only mutate if newResult !== undefined
                            // ldeferred[which](newResult);

                            ldeferred[which](newResult === undef ? result : newResult);

                        }
                    } catch(e) {
                        // Exceptions cause chained deferreds to complete
                        // TODO: Should it *also* switch this promise's handlers to failed??
                        // I think no.
                        // which = 'reject';

                        ldeferred.reject(e);
                    }
                }
            }
        }

        // The full Deferred object, with both Promise and Resolver parts
        deferred = {};

        // Promise and Resolver parts

        // Expose Promise API
        promise = deferred.promise  = {
            then: (deferred.then = then)
        };

        // Expose Resolver API
        resolver = deferred.resolver = {
            resolve:  (deferred.resolve  = resolve),
            reject:   (deferred.reject   = reject),
            progress: (deferred.progress = progress)
        };

        // Freeze Promise and Resolver APIs
        freeze(promise);
        freeze(resolver);

        return deferred;
    }

    // Determines if promiseOrValue is a promise or not.  Uses the feature
    // test from http://wiki.commonjs.org/wiki/Promises/A to determine if
    // promiseOrValue is a promise.
    //
    // Parameters:
    //  promiseOrValue - anything
    //
    // Return true if promiseOrValue is a promise.
    function isPromise(promiseOrValue) {
        return promiseOrValue && typeof promiseOrValue.then === 'function';
    }

    // Register a handler for a promise or immediate value
    //
    // Parameters:
    //  promiseOrValue - anything
    //
    // Returns a new promise that will resolve:
    // 1. if promiseOrValue is a promise, when promiseOrValue resolves
    // 2. if promiseOrValue is a value, immediately
    function when(promiseOrValue, callback, errback, progressHandler) {
        var deferred, resolve, reject;

        deferred = defer();

        resolve = callback ? callback : function(val) { return val; };
        reject  = errback  ? errback  : function(err) { return err; };

        if(isPromise(promiseOrValue)) {
            // If it's a promise, ensure that deferred will complete when promiseOrValue
            // completes.
            promiseOrValue.then(resolve, reject,
                function(update) { progressHandler(update); }
            );
            _chain(promiseOrValue, deferred);

        } else {
            // If it's a value, resolve immediately
            deferred.resolve(resolve(promiseOrValue));

        }

        return deferred.promise;
    }

    // Return a promise that will resolve when howMany of the supplied promisesOrValues
    // have resolved. The resolution value of the returned promise will be an array of
    // length howMany containing the resolutions values of the triggering promisesOrValues.
    function some(promisesOrValues, howMany, callback, errback, progressHandler) {
        var toResolve, results, ret, deferred, resolver, rejecter, handleProgress;

        toResolve = Math.max(0, Math.min(howMany, promisesOrValues.length));
        results = [];
        deferred = defer();
        ret = (callback || errback || progressHandler)
            ? deferred.then(callback, errback, progressHandler)
            : deferred.promise;

        // Resolver for promises.  Captures the value and resolves
        // the returned promise when toResolve reaches zero.
        // Overwrites resolver var with a noop once promise has
        // be resolved to cover case where n < promises.length
        resolver = function(val) {
            results.push(val);
            if(--toResolve === 0) {
                resolver = handleProgress = noop;
                deferred.resolve(results);
            }
        };

        // Wrapper so that resolver can be replaced
        function resolve(val) {
            resolver(val);
        }

        // Rejecter for promises.  Rejects returned promise
        // immediately, and overwrites rejecter var with a noop
        // once promise to cover case where n < promises.length.
        // TODO: Consider rejecting only when N (or promises.length - N?)
        // promises have been rejected instead of only one?
        rejecter = function(err) {
            rejecter = handleProgress = noop;
            deferred.reject(err);
        };

        // Wrapper so that rejecer can be replaced
        function reject(err) {
            rejecter(err);
        }

        handleProgress = function(update) {
            deferred.progress(update);
        };

        function progress(update) {
            handleProgress(update);
        }

        if(toResolve === 0) {
            deferred.resolve(results);
        } else {
            var promiseOrValue, i = 0;
            while((promiseOrValue = promisesOrValues[i++])) {
                when(promiseOrValue, resolve, reject, progress);
            }
        }

        return ret;
    }

    // Return a promise that will resolve only once all the supplied promisesOrValues
    // have resolved. The resolution value of the returned promise will be an array
    // containing the resolution values of each of the promisesOrValues.
    function all(promisesOrValues, callback, errback, progressHandler) {
        return some(promisesOrValues, promisesOrValues.length, callback, errback, progressHandler);
    }

    // Return a promise that will resolve when any one of the supplied promisesOrValues
    // has resolved. The resolution value of the returned promise will be the resolution
    // value of the triggering promiseOrValue.
    function any(promisesOrValues, callback, errback, progressHandler) {
        return some(promisesOrValues, 1, callback, errback, progressHandler);
    }

    // Ensure that resolution of promiseOrValue will complete resolver with the completion
    // value of promiseOrValue, or instead with optionalValue if it is provided.
    //
    // Parameters:
    //  promiseOrValue - Promise, that when completed, will trigger completion of resolver,
    //      or value that will trigger immediate resolution of resolver
    //  resolver - Resolver to complete when promise completes
    //  resolveValue - optional value to use as the resolution value
    //      used to resolve second, rather than the resolution
    //      value of first.
    //
    // Returns a new promise that will complete when promiseOrValue is completed,
    // with the completion value of promiseOrValue, or instead with optionalValue if it
    // is provided.
    function chain(promiseOrValue, resolver, resolveValue) {
        var inputPromise, initChain;

        inputPromise = when(promiseOrValue);

        // Check against args length instead of resolvedValue === undefined, since
        // undefined may be a valid resolution value.
        initChain = arguments.length > 2
            ? function(resolver) { return _chain(inputPromise, resolver, resolveValue) }
            : function(resolver) { return _chain(inputPromise, resolver); };

        // Setup chain to supplied resolver
        initChain(resolver);

        // Setup chain to new promise
        return initChain(scope.defer()).promise;
    }

    // Internal chain helper that does not create a new deferred/promise
    // Always returns it's 2nd arg.
    // NOTE: deferred must be a when.js deferred, or a resolver whose functions
    // can be called without their original context.
    function _chain(promise, deferred, resolveValue) {
        promise.then(
            // If resolveValue was supplied, need to wrap up a new function
            // If not, can use deferred.resolve directly
            arguments.length > 2
                ? function() { deferred.resolve(resolveValue) }
                : deferred.resolve,
            deferred.reject,
            deferred.progress
        );

        return deferred;
    }

    //
    // Public API
    //

    scope.defer     = defer;

    scope.isPromise = isPromise;
    scope.some      = some;
    scope.all       = all;
    scope.any       = any;
    scope.chain     = chain;
    scope.when      = when;


})(require('less/when'));
