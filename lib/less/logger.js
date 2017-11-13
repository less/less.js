export default {
    error(msg) {
        this._fireEvent("error", msg);
    },
    warn(msg) {
        this._fireEvent("warn", msg);
    },
    info(msg) {
        this._fireEvent("info", msg);
    },
    debug(msg) {
        this._fireEvent("debug", msg);
    },
    addListener(listener) {
        this._listeners.push(listener);
    },
    removeListener(listener) {
        for (let i = 0; i < this._listeners.length; i++) {
            if (this._listeners[i] === listener) {
                this._listeners.splice(i, 1);
                return;
            }
        }
    },
    _fireEvent(type, msg) {
        for (let i = 0; i < this._listeners.length; i++) {
            const logFunction = this._listeners[i][type];
            if (logFunction) {
                logFunction(msg);
            }
        }
    },
    _listeners: []
};
