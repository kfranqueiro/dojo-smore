define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/promise/all',
	'dojo/request',
	'dojo/store/Memory',
	'dojo/store/Observable',
	'dojo-smore/RequestMemory'
], function (test, assert, all, request, Memory, Observable, RequestMemory) {
	test.suite('RequestMemory', function () {
		var url = require.toUrl('dojo-smore/test/data') + '/items.json';
		var reqmem = new Observable(new RequestMemory({
			url: url
		}));
		var reqmemfast = new Observable(new RequestMemory({
			url: url,
			alwaysPromise: false
		}));
		var mem;

		test.before(function () {
			return request.get(url, { handleAs: 'json' }).then(function (data) {
				mem = new Observable(new Memory({ data: data }));
			});
		});

		test.test('query', function () {
			var reqmemResults = reqmem.query({});
			var reqmemfastResults = reqmemfast.query({});

			assert.isTrue(typeof reqmemResults.then === 'function' && typeof reqmemResults.forEach === 'function',
				'query on RequestMemory w/ alwaysPromise: true should return a promise wrapped with QueryResults');
			assert.isTrue(typeof reqmemfastResults.forEach === 'function',
				'query on RequestMemory w/ alwaysPromise: false should return an object wrapped with QueryResults');

			return all([
				reqmemResults,
				reqmemfastResults
			]).then(function (results) {
				var reqmemResults = results[0];
				var reqmemfastResults = results[1];
				var memResults = mem.query({});
				var memLength = memResults.length;
				assert.isTrue(
					memLength === 4 &&
						reqmemResults.length === memLength &&
						reqmemfastResults.length === memLength &&
						reqmemResults[0].name === memResults[0].name &&
						reqmemfastResults[0].name === memResults[0].name &&
						reqmemResults[3].name === memResults[3].name &&
						reqmemfastResults[3].name === memResults[3].name,
					'All stores should yield matching query results');
			});
		});

		test.test('paged query', function () {
			var reqmemResults = reqmem.query({});
			var reqmemfastResults = reqmemfast.query({});
			var reqmemPagedResults = reqmem.query({}, { start: 0, count: 1 });
			var reqmemfastPagedResults = reqmemfast.query({}, { start: 0, count: 1 });

			return all([
				reqmemResults.total,
				reqmemfastResults.total,
				reqmemPagedResults.total,
				reqmemfastPagedResults.total
			]).then(function (results) {
				var memTotal = mem.query({}, { start: 0, count: 1 }).total;
				assert.isTrue(
					memTotal === 4 &&
						results[0] === memTotal && results[1] === memTotal &&
						results[2] === memTotal && results[3] === memTotal,
					'All stores should yield matching totals');
			});
		});

		test.test('get', function () {
			return all([
				reqmem.get(1),
				reqmemfast.get(1)
			]).then(function (results) {
				var reqmemItem = results[0];
				var reqmemfastItem = results[1];
				var memItem = mem.get(1);
				assert.isTrue(
					memItem.name === 'foo' &&
						reqmemItem.name === memItem.name &&
						reqmemfastItem.name === memItem.name,
					'All stores should yield the same item for the same get request');
			});
		});

		test.test('add', function () {
			var id = 5;
			var name = 'mushroom';
			return all([
				reqmem.add({ id: id, name: name }),
				reqmemfast.add({ id: id, name: name })
			]).then(function (results) {
				var reqmemId = results[0];
				var reqmemfastId = results[1];
				var memId = mem.add({ id: id, name: name });
				assert.isTrue(reqmemId === memId && reqmemfastId === memId,
					'All stores should eventually yield the same id for the same add request');
			});
		});

		test.test('promise behavior', function () {
			return all([
				// setUrl returns the request promise
				reqmem.setUrl(url),
				reqmemfast.setUrl(url)
			]).then(function () {
				assert.strictEqual(typeof reqmem.query({}).then, 'function',
					'alwaysPromise: true should yield promise on query even after request completes');
				assert.isUndefined(reqmemfast.query({}).then,
					'alwaysPromise: false should not yield promise on query after request completes');
				assert.strictEqual(typeof reqmem.get(1).then, 'function',
					'alwaysPromise: true should yield promise on get even after request completes');
				assert.isUndefined(reqmemfast.get(1).then,
					'alwaysPromise: false should not yield promise on get after request completes');
				assert.strictEqual(typeof reqmem.put({ id: 1, name: 'foo' }).then, 'function',
					'alwaysPromise: true should yield promise on put even after request completes');
				assert.isUndefined(reqmemfast.put({ id: 1, name: 'foo' }).then,
					'alwaysPromise: false should not yield promise on put after request completes');
			});
		});

		test.test('setData after setUrl but before resolution', function () {
			var store = new RequestMemory();
			var promise = store.setUrl(url);

			store.setData([ { id: 1, name: 'Zaphod' } ]);

			assert.strictEqual(store.get(1).name, 'Zaphod',
				'Call to store after direct setData call should be synchronous');
			assert.isTrue(promise.isCanceled(),
				'setUrl process should have been interrupted after setData call');
		});
	});
});
