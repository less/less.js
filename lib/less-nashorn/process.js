if (typeof process === 'undefined') {
    var Process = function() {
        this.originalExit = null;
    };

    var args = [];
    args[0] = java.nio.file.Paths.get(".").normalize().toString();
    args[1] = "lessjjsc";
    for(var i = 0; i < arguments.length; i++) {
        args[2 + i] = arguments[i];
    }
    Process.prototype.argv = args;
    Process.prototype.title = "jjs";
    Process.prototype.stdout = {
        write: function(msg) {
            java.lang.System.out.print(msg);
        }
    }
    Process.prototype.stderr = {
        write: function(msg) {
            java.lang.System.err.print(msg);
        }
    }
    Process.prototype.cwd = function() {
        return __rootDir.toString();
    };
    Process.prototype.on = function(event, callback) {
        if (event === 'exit') {
            if (!this.originalExit)
                this.originalExit = exit;
            exit = callback;
        }
    };
    Process.prototype.reallyExit = function(errorCode) {
        if (this.originalExit)
            this.originalExit(errorCode);
        else
            exit(errorCode);
    };
    process = new Process();
}