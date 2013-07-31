
var assert = {
  ok: function(value, message) {
    message = message || '';
    if(!value) throw new Error("assertion failed", message);
  }
}
