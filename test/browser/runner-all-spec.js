console.warn("start spec");

describe("less.js error reporting console test", function() {
    testLessErrors(specs['console-errors'], {
    	errorReporting: 'console',
    	strictUnits: true
    });
});

describe("less.js global vars", function() {
    testLessEquals(specs['global-vars'], {
	    logLevel: 4,
	    errorReporting: "console",
	    globalVars: {
	        "@global-var": "red"
	    }
	});
});

describe("less.js legacy tests", function() {
    testLessEquals(specs['legacy'], {
	    logLevel: 4,
	    errorReporting: "console",
	    strictMath: false,
	    strictUnits: false 
	});
});

describe("less.js javascript disabled error tests", function() {
    testLessErrors(specs['no-js-errors'], {
    	logLevel: 4,
    	errorReporting: 'console',
    	strictUnits: true
    	//javascriptEnabled: true   -- inline JS disabled by default in > 3.x
    });
});


describe("less.js filemanager Plugin", function() {
    testLessEquals(specs['filemanagerPlugin'], {
    	logLevel: 4,
	    errorReporting: "console",
	    plugins: [AddFilePlugin]
    });
});


describe("less.js postProcessor Plugin", function() {
    testLessEquals(specs['postProcessorPlugin'], {
    	logLevel: 4,
	    errorReporting: "console",
	    plugins: [postProcessorPlugin]
    });
});

describe("less.js preProcessor Plugin", function() {
    testLessEquals(specs['preProcessorPlugin'], {
    	logLevel: 4,
	    errorReporting: "console",
	    plugins: [preProcessorPlugin]
    });
});

describe("less.js Visitor Plugin", function() {
    testLessEquals(specs['visitorPlugin'], {
    	logLevel: 4,
	    errorReporting: "console",
	    plugins: [VisitorPlugin]
    });
});

describe("less.js Visitor Plugin", function() {
    testLessEquals(specs['visitorPlugin'], {
    	logLevel: 4,
	    errorReporting: "console",
	    plugins: [VisitorPlugin]
    });
});

describe("less.js production behaviour", function() {
	
	var options = {
		logLevel: 1,
    	errorReporting: "console",
    	env: "production"
    };

    it("doesn't log any messages", function(done) {
    	logMessages = [];
    	less.render('@nothing: nothing', options, function(err, result) {
        	expect(logMessages.length).toEqual(0);
        	done();
    	});
        
    });
});

// Will be relative to .less document in this test without rootpath
// describe("less.js browser test - relative urls", function() {
//     testLessEquals(specs['relative-urls'], {
//     	logLevel: 4,
// 	    errorReporting: "console",
// 		relativeUrls: true
// 	});
// });

// describe("less.js browser test - rootpath urls", function() {
//     testLessEquals(specs['rootpath'], {
//     	logLevel: 4,
// 	    errorReporting: "console",
// 		rootpath: "https://localhost/"
// 	});
// });

// describe("less.js browser test - rootpath and relative urls", function() {
//     testLessEquals(specs['rootpath-relative'], {
//     	logLevel: 4,
// 	    errorReporting: "console",
// 		rootpath: "https://www.github.com/cloudhead/less.js/",
// 		relativeUrls: true
// 	});
// });

describe("less.js strict units tests", function() {
    testLessEquals(specs['strict-units'], {
	    logLevel: 4,
	    errorReporting: "console",
	    strictMath: true,
	    strictUnits: true 
	});
});







