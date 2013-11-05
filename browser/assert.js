
var assert = {
  ok: function(value, message) {
    message = message || '';
    if(!value) throw new Error("assertion failed", message);
  }
};

if (navigator.userAgent.indexOf('MSIE 8.0') !== -1 || navigator.userAgent.indexOf('MSIE 7.0') !== -1) {
  Object.defineProperty = function(o, p, fn) { o[p] = fn.value; };
}


