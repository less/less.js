if (typeof(window) === 'undefined') { less = {} }
else                                { less = window.less = {} }
tree = less.tree = {};
less.mode = 'rhino';

console = {
    log: function(arg) {
        java.lang.System.err.println(arg);
    }
};
