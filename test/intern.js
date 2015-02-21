define([
	'intern/dojo/has'
], function (has) {
	return {
		// No tunnel / environment configuration is provided,
		// since some tests are currently only runnable against a server that supports PHP.

		loader: {
			baseUrl: has('host-browser') ? '../../..' : '..',
			packages: [
				{ name: 'dojo', location: 'dojo' },
				{ name: 'dojo-smore', location: 'dojo-smore' }
			]
		},

		suites: [ 'dojo-smore/test/all' ]
	};
});
