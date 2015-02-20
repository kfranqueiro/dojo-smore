var miniExcludes = {
		'dojo-smore/README.md': 1,
		'dojo-smore/package': 1
	};
var isTestRe = /\/test\//;

// jshint unused: false
var profile = {
	resourceTags: {
		test: function (filename) {
			return isTestRe.test(filename);
		},

		miniExclude: function (filename, mid) {
			return isTestRe.test(filename) || mid in miniExcludes;
		},

		amd: function (filename) {
			return /\.js$/.test(filename);
		}
	}
};
