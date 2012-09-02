var dojoConfig = {
	async: true,
	packages: [
		// Configure this package so that tests work regardless of folder name.
		{ name: "dojo-smore", location: location.pathname.replace(/\/[^/]+$/, '') + '/..'}
	]
};