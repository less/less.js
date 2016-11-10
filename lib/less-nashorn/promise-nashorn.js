var PromiseNashorn = function(init) {
    var _promise = this;
    this.status = 'pending';
    this.data = null;

    function resolve(result) {
        _promise.data = result;
        _promise.status = 'fulfilled';
        return _promise;
    }
    function reject(reason) {
        _promise.data = reason;
        _promise.status = 'rejected';
        return _promise;
    }

    try {
        init(resolve, reject);
    }
    catch (e) {
        reject(e);
    }
}
PromiseNashorn.prototype.then = function(onFulfilled, onRejected) {
    if (this.status === 'fulfilled') {
        if (onFulfilled)
            onFulfilled(this.data);
    }
    else if (this.status === 'rejected') {
        if (onRejected)
            onRejected(this.data);
    }
    return this;
}
PromiseNashorn.prototype.catch = function(onRejected) {
    if (this.status === 'rejected') {
        if(onRejected)
            onRejected(this.result);
    }
    return this;
}

module.exports = PromiseNashorn;