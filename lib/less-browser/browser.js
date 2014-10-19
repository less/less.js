var utils = require("./utils");
module.exports = {
    createCSS: function (document, styles, sheet) {
        // Strip the query-string
        var href = sheet.href || '';

        // If there is no title set, use the filename, minus the extension
        var id = 'less:' + (sheet.title || utils.extractId(href));

        // If this has already been inserted into the DOM, we may need to replace it
        var oldCss = document.getElementById(id);
        var keepOldCss = false;

        // Create a new stylesheet node for insertion or (if necessary) replacement
        var css = document.createElement('style');
        css.setAttribute('type', 'text/css');
        if (sheet.media) {
            css.setAttribute('media', sheet.media);
        }
        css.id = id;

        if (!css.styleSheet) {
            css.appendChild(document.createTextNode(styles));

            // If new contents match contents of oldCss, don't replace oldCss
            keepOldCss = (oldCss !== null && oldCss.childNodes.length > 0 && css.childNodes.length > 0 &&
                oldCss.firstChild.nodeValue === css.firstChild.nodeValue);
        }

        var head = document.getElementsByTagName('head')[0];

        // If there is no oldCss, just append; otherwise, only append if we need
        // to replace oldCss with an updated stylesheet
        if (oldCss === null || keepOldCss === false) {
            var nextEl = sheet && sheet.nextSibling || null;
            if (nextEl) {
                nextEl.parentNode.insertBefore(css, nextEl);
            } else {
                head.appendChild(css);
            }
        }
        if (oldCss && keepOldCss === false) {
            oldCss.parentNode.removeChild(oldCss);
        }

        // For IE.
        // This needs to happen *after* the style element is added to the DOM, otherwise IE 7 and 8 may crash.
        // See http://social.msdn.microsoft.com/Forums/en-US/7e081b65-878a-4c22-8e68-c10d39c2ed32/internet-explorer-crashes-appending-style-element-to-head
        if (css.styleSheet) {
            try {
                css.styleSheet.cssText = styles;
            } catch (e) {
                throw new Error("Couldn't reassign styleSheet.cssText.");
            }
        }
    }
};
