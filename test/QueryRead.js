define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/promise/all',
	'dojo-smore/QueryRead'
],
function (test, assert, lang, aspect, all, QueryRead) {
	var url = require.toUrl('dojo-smore/test/data') + '/queryread.php';
	var store = new QueryRead({ url: url });
	var headerStore = new QueryRead({ url: url });
	var noHeaderStore = new QueryRead({ url: url });

	// store will be used to test receiving an object with properties containing
	// the items array and the total number of results.  To accommodate this,
	// the test service respects an additional `useObject` parameter.
	// We aspect after processQuery to add this parameter.
	aspect.after(store, 'processQuery', function (args) {
		args.query.useObject = 1;
		return args;
	});

	// headerStore will be used to test receiving total via the
	// Content-Range header rather than nesting the results within an object.
	// To accommodate this, the test service respects an additional
	// `useContentHeaders` parameter.
	// We aspect after processQuery to add this parameter.
	aspect.after(headerStore, 'processQuery', function (args) {
		args.query.useContentRange = 1;
		return args;
	});

	// noHeaderStore will be used to test not receiving total by either means,
	// in which case QueryRead is designed to simply fall back to the length
	// of the returned results.  (It should not reject with an error.)
	// Since neither the Content-Range header nor the total property is to be
	// set, we don't aspect after processQuery at all.

	test.suite('QueryRead', function () {
		var expectedTotal = 100;
		var handles;

		test.beforeEach(function () {
			handles = [];
		});

		test.afterEach(function () {
			for (var i = handles.length; i--;) {
				handles[i].remove();
			}
		});

		test.test('query', function () {
			var count = 20;
			var results = store.query({}, { start: 0, count: count });
			var headerResults = headerStore.query({}, { start: 0, count: count });
			var noHeaderResults = noHeaderStore.query({}, { start: 0, count: count });

			assert.isDefined(results.then && results.forEach && headerResults.then && headerResults.forEach,
				'query should return a promise wrapped with QueryResults');

			var promise = all([
				results,
				results.total,
				headerResults,
				headerResults.total,
				noHeaderResults,
				noHeaderResults.total
			]);

			return promise.then(function (arr) {
				var results = arr[0];
				var total = arr[1];
				var headerResults = arr[2];
				var headerTotal = arr[3];
				var noHeaderResults = arr[4];
				var noHeaderTotal = arr[5];

				assert.strictEqual(results.length, count,
					'Query results (array within object) should contain expected number of items.');
				assert.strictEqual(headerResults.length, count,
					'Query results (direct array) should contain expected number of items.');
				assert.strictEqual(noHeaderResults.length, count,
					'Query results (direct array, no header) should contain expected number of items.');
				assert.strictEqual(total, expectedTotal,
					'Query should return expected total (from object top-level).');
				assert.strictEqual(headerTotal, expectedTotal,
					'Query should return expected total (from Content-Range header).');
				assert.strictEqual(noHeaderTotal, count,
					'Query should return expected total (equivalent to length of result set).');
				assert.isTrue(
					results[0].id === 1 && headerResults[0].id === 1 && noHeaderResults[0].id === 1 &&
						results[count - 1].id === count && headerResults[count - 1].id === count &&
						noHeaderResults[count - 1].id === count,
					'Query results should be sorted ascending');
			});
		});

		test.test('query with alternative parameter names', function () {
			// Define a store with custom param/property names.
			var paramsAndProps = {
				startParam: 'trats',
				countParam: 'tnuoc',
				sortParam: 'tros',
				itemsProperty: 'smeti',
				totalProperty: 'latot',
				useObject: 1
			};
			var store = new QueryRead(lang.mixin({ url: url }, paramsAndProps));
			var count = 20;

			// Aspect onto the store's processQuery function to instruct the
			// test service to match the above names.
			handles.push(aspect.after(store, 'processQuery', function (args) {
				lang.mixin(args.query, paramsAndProps);
				return args;
			}));

			var results = store.query({}, {
				start: 0,
				count: count,
				sort: [ { attribute: 'id', descending: true } ]
			});

			return all([ results, results.total ]).then(function (arr) {
				var results = arr[0];
				var total = arr[1];

				assert.strictEqual(results.length, count,
					'Query results (array within object) should contain expected number of items.');
				assert.strictEqual(total, expectedTotal,
					'Query should return expected total (from object top-level).');
				assert.isTrue(results[0].id === count && results[count - 1].id === 1,
					'Query results should be sorted descending');
			});
		});

		test.test('get', function () {
			var promise = store.get(42);
			var headerPromise = headerStore.get(42);

			assert.isTrue(typeof promise.then === 'function' && typeof headerPromise.then === 'function',
				'get should return a promise');

			return all([ promise, headerPromise ]).then(function (objs) {
				var obj = objs[0];
				var headerObj = objs[1];
				var expectedName = 'Item 42';

				assert.strictEqual(obj.name, expectedName,
					'Resolved object should contain expected data (from data w/ nested array).');
				assert.strictEqual(headerObj.name, expectedName,
					'Resolved object should contain expected data (from data w/ array + header).');
			});
		});
	});
});
