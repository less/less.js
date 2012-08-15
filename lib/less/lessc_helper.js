// lessc_helper.js
//
//      helper functions for lessc

var lessc_helper = {

    //Stylize a string
    stylize : function(str, style) {
        var styles = {
            'reset'     : [0,   0],
            'bold'      : [1,  22],
            'inverse'   : [7,  27],
            'underline' : [4,  24],
            'yellow'    : [33, 39],
            'green'     : [32, 39],
            'red'       : [31, 39],
            'grey'      : [90, 39]
        };
        return '\033[' + styles[style][0] + 'm' + str +
               '\033[' + styles[style][1] + 'm';
    }

}

// Exports helper functions
for (var h in lessc_helper) { exports[h] = lessc_helper[h] }
