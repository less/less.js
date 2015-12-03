

// When the cache is disabled, it will stay empty

var cache = {};
var enabled = false;

module.exports = {

    isEnabled: function() {
       return enabled;
    },
    enable: function() {
       enabled = true;
    },
    disable: function() {
       enabled = false;
       this.clean();
    },
    
    set: function (key, value) {
        if ( enabled ) {
            cache[key] = value;
        }
    },
    get: function (key) {
        return cache[key];
    },
    remove: function(key) {
        delete cache[key];
    },
    clean: function(key) {
        cache = {};
    }
};

