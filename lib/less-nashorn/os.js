
var OperatingSystem = function() {
};
OperatingSystem.prototype.type = function() {
    return java.lang.System.getProperty('os.name');
};

module.exports = new OperatingSystem();