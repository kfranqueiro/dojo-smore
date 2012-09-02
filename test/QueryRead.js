define(["doh", "dojo/_base/lang", "dojo/aspect", "dojo/promise/all", "dojo-smore/QueryRead"],
function(doh, lang, aspect, all, QueryRead) {
	var url = require.toUrl("dojo-smore/test/data") + "/queryread.php",
		store = new QueryRead({ url: url }),
		headerStore = new QueryRead({
			url: url
		});
	
	// headerStore will be used to test receiving total via the
	// Content-Range header rather than nesting the results within an object.
	// To accommodate this, the test service respects an additional
	// `useContentHeaders` parameter.  We need to add that to our queries,
	// so we'll aspect onto the processQuery function to do that.
	aspect.after(headerStore, "processQuery", function(args) {
		args.query.useContentRange = 1;
		return args;
	});
	
	doh.register("QueryRead tests", [
		function testQuery(t) {
			var dfd = new doh.Deferred(),
				count = 20,
				results = store.query({}, { start: 0, count: count }),
				headerResults = headerStore.query({}, { start: 0, count: count });
			
			t.t(results.then && results.forEach && headerResults.then && headerResults.forEach,
				"query should return a promise wrapped with QueryResults");
			
			all([results, results.total, headerResults, headerResults.total]).then(function(arr) {
				var results = arr[0],
					total = arr[1],
					headerResults = arr[2],
					headerTotal = arr[3];
				
				dfd.getTestCallback(function() {
					t.is(count, results.length,
						"Query results (array within object) should contain expected number of items.");
					t.is(count, headerResults.length,
						"Query results (direct array) should contain expected number of items.");
					t.is(100, total,
						"Query should return expected total (from object top-level).");
					t.is(100, headerTotal,
						"Query should return expected total (from Content-Range header).");
					t.t(1 === results[0].id && 1 === headerResults[0].id &&
						count === results[count - 1].id && count === headerResults[count - 1].id,
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
					totalProperty: "latot"
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