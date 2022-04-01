import Keyword from '../tree/keyword';
import * as utils from '../utils';

const defaultFunc = {
    eval: function () {
        const v = this.value_;
        const e = this.error_;
        if (e) {
            throw e;
        }
        if (!utils.isNullOrUndefined(v)) {
            return v ? Keyword.True : Keyword.False;
        }
    },
    value: function (v) {
        this.value_ = v;
    },
    error: function (e) {
        this.error_ = e;
    },
    reset: function () {
        this.value_ = this.error_ = null;
    }
};

export default defaultFunc;
