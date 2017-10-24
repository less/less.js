var isUrlRe = /^(?:https?:)?\/\//i,
    PromiseConstructor,
    AbstractFileManager = require("../less/environment/abstract-file-manager.js"),
    logger = require("../less/logger");

var UrlFileManager = function() {
};

UrlFileManager.prototype = new AbstractFileManager();

UrlFileManager.prototype.supports = function(filename, currentDirectory, options, environment) {
    return isUrlRe.test( filename ) || isUrlRe.test(currentDirectory);
};

UrlFileManager.prototype.loadFile = function(filename, currentDirectory, options, environment) {
    if (!PromiseConstructor) {
        PromiseConstructor = typeof Promise === 'undefined' ? require('promise') : Promise;
    }
    return new PromiseConstructor(function(fulfill, reject) {
        var url = null;
        var con = null;
        var i;
        try {
            // TODO: test a case that currentDirectory and filename need to be combined
            url = isUrlRe.test( filename ) ? new java.net.URL(filename) : new java.net.URL(new java.net.URL(currentDirectory), filename);

            con = url.openConnection();
            if (options.insecure && url.getProtocol() === 'https') {
                // If insecure SSL certs are allowed, the follow will accept all certificates invalid certificates and host names
                var trustAllCerts = new (Java.type('javax.net.ssl.TrustManager[]'))(1);
                trustAllCerts[0] = new javax.net.ssl.X509TrustManager() {
                    getAcceptedIssuers: function() { return null; },
                    checkClientTrusted: function(certs, authType) { },
                    checkServerTrusted: function(certs, authType) { }
                };

                var sc = javax.net.ssl.SSLContext.getInstance("SSL");
                sc.init(null, trustAllCerts, new java.security.SecureRandom());
                var allHostsValid = new javax.net.ssl.HostnameVerifier() {
                    verify: function (hostname, session) {
                        return true;
                    }
                };

                con.setSSLSocketFactory(sc.getSocketFactory());
                con.setHostnameVerifier(allHostsValid);
            }
            con.setRequestMethod('GET');
            con.connect();

            var statusCode = con.getResponseCode();

            if (statusCode === 404) {
                reject({ type: 'File', message: "resource '" + url.toString() + "' was not found\n" });
                return;
            }

            var bis = new java.io.BufferedInputStream(con.getInputStream());
            var bas = new java.io.ByteArrayOutputStream();
            while ((i = bis.read()) != -1) {
                bas.write(i);
            }
            bas.flush();
            bas.close();
            if (bas.size() == 0) {
                logger.warn('Warning: Empty body (HTTP ' + statusCode + ') returned by "' + url.toString() + '"');
            }
            // Try to determine the content type
            if (!options.encoding)
                options.encoding = con.getContentEncoding() ? con.getContentEncoding() : (con.getContentType() ? environment.charsetLookup(con.getContentType()) : 'UTF-8');
            // Fallback to UTF-8 if something went wrong
            if (!options.encoding)
                options.encoding = 'UTF-8';

            if (/(^utf|ascii$)/i.test(options.encoding))
                fulfill({ contents: new java.lang.String(bas.toByteArray(), options.encoding), filename: url.toString() });
            else
                fulfill({ contents: bas.toByteArray(), filename: url.toString() });
        } catch (e) {
            reject({ type: 'File', message: "resource '" + url.toString() + "' gave this Error:\n  "+e.toString()+"\n" });
        }
    });
};

module.exports = UrlFileManager;
