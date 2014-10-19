module.exports = {
    extractId: function(href) {
        return href.replace(/^[a-z-]+:\/+?[^\/]+/, '' )  // Remove protocol & domain
            .replace(/^\//,                 '' )  // Remove root /
            .replace(/\.[a-zA-Z]+$/,        '' )  // Remove simple extension
            .replace(/[^\.\w-]+/g,          '-')  // Replace illegal characters
            .replace(/\./g,                 ':'); // Replace dots with colons(for valid id)
    }
};
