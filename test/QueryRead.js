define(["doh", "dojo/_base/lang", "dojo/aspect", "dojo/promise/all", "dojo-smore/QueryRead"],
function(doh, lang, aspect, all, QueryRead) {
	var url = require.toUrl("dojo-smore/test/data") + "/queryread.php",
		store = new QueryRead({ url: url }),
		headerStore = new QueryRead({ url: url }),
		noHeaderStore = new QueryRead({ url: url });
	
	// store will be used to test receiving an object with properties containing
	// the items array and the total number of results.  To accommodate this,
	// the test service respects an additional `useObject` parameter.
	// We aspect after processQuery to add this parameter.
	aspect.after(store, "processQuery", function(args) {
		args.query.useObject = 1;
		return args;
	});
	
	// headerStore will be used to test receiving total via the
	// Content-Range header rather than nesting the results within an object.
	// To accommodate this, the test service respects an additional
	// `useContentHeaders` parameter.
	// We aspect after processQuery to add this parameter.
	aspect.after(headerStore, "processQuery", function(args) {
		args.query.useContentRange = 1;
		return args;
	});
	
	// noHeaderStore will be used to test not receiving total by either means,
	// in which case QueryRead is designed to simply fall back to the length
	// of the returned results.  (It should not reject with an error.)
	// Since neither the Content-Range header nor the total property is to be
	// set, we don't aspect after processQuery at all.
	
	doh.register("QueryRead tests", [
		function testQuery(t) {
			var dfd = new doh.Deferred(),
				count = 20,
				results = store.query({}, { start: 0, count: count }),
				headerResults = headerStore.query({}, { start: 0, count: count }),
				noHeaderResults = noHeaderStore.query({}, { start: 0, count: count });
			
			t.t(results.then && results.forEach && headerResults.then && headerResults.forEach,
				"query should return a promise wrapped with QueryResults");
			
			all([results, results.total, headerResults, headerResults.total, noHeaderResults, noHeaderResults.total]).then(function(arr) {
				var results = arr[0],
					total = arr[1],
					headerResults = arr[2],
					headerTotal = arr[3],
					noHeaderResults = arr[4],
					noHeaderTotal = arr[5];
				
				dfd.getTestCallback(function() {
					t.is(count, results.length,
						"Query results (array within object) should contain expected number of items.");
					t.is(count, headerResults.length,
						"Query results (direct array) should contain expected number of items.");
					t.is(count, noHeaderResults.length,
						"Query results (direct array, no header) should contain expected number of items.");
					t.is(100, total,
						"Query should return expected total (from object top-level).");
					t.is(100, headerTotal,
						"Query should return expected total (from Content-Range header).");
					t.is(count, noHeaderTotal,
						"Query should return expected total (equivalent to length of result set).");
					t.t(1 === results[0].id && 1 === headerResults[0].id && 1 === noHeaderResults[0].id &&
						count === results[count - 1].id && count === headerResults[count - 1].id && count === noHeaderResults[count - 1].id,
						"Query results should be sorted ascending");
				})();
			}, function(err) {
				dfd.errback(err);
			});
			
			return dfd;
		},
		function testQueryAltParams(t) {
			// Define a store with custom param/property names.
			var dfd = new doh.Deferred(),
				paramsAndProps = {
					startParam: "trats",
					countParam: "tnuoc",
					sortParam: "tros",
					itemsProperty: "smeti",
					totalProperty: "latot",
					useObject: 1
				},
				store = new QueryRead(lang.mixin({ url: url }, paramsAndProps)),
				count = 20,
				results;
			
			// Aspect onto the store's processQuery function to instruct the
			// test service to match the above names.
			aspect.after(store, "processQuery", function(args) {
				lang.mixin(args.query, paramsAndProps);
				return args;
			});
			
			results = store.query({}, {
				start: 0,
				count: count,
				sort: [{ attribute: "id", descending: true }]
			});
			
			all([results, results.total]).then(function(arr) {
				var results = arr[0],
					total = arr[1];
				
				dfd.getTestCallback(function() {
					t.is(count, results.length,
						"Query results (array within object) should contain expected number of items.");
					t.is(100, total,
						"Query should return expected total (from object top-level).");
					t.t(count === results[0].id && 1 === results[count - 1].id,
						"Query results should be sorted descending");
				})();
			}, function(err) {
				dfd.errback(err);
			});
			
			return dfd;
		},
		function testGetObject(t) {
			var dfd = new doh.Deferred(),
				promise = store.get(42),
				headerPromise = headerStore.get(42);
			
			t.t(promise.then && headerPromise.then, "get should return a promise");
			
			all([promise, headerPromise]).then(function(objs) {
				var obj = objs[0],
					headerObj = objs[1];
				
				dfd.getTestCallback(function() {
					t.is("Item 42", obj.name,
						"Resolved object should contain expected data (from data w/ nested array).");
					t.is("Item 42", headerObj.name,
						"Resolved object should contain expected data (from data w/ array + header).");
				})();
			}, function(err) {
				dfd.errback(err);
			});
			
			return dfd;
		}
	]);
});