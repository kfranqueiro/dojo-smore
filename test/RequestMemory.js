define(["doh", "dojo/when", "dojo/promise/all", "dojo/request", "dojo/store/Memory", "dojo/store/Observable", "dojo-smore/RequestMemory"],
function(doh, when, all, request, Memory, Observable, RequestMemory) {
	var url = require.toUrl("dojo-smore/test/data") + "/items.json",
		reqmem = new Observable(new RequestMemory({
			url: url
		})),
		reqmemfast = new Observable(new RequestMemory({
			url: url,
			alwaysPromise: false
		})),
		mem;
	
	request.get(url, { handleAs: "json" }).then(function(data) {
		mem = new Observable(new Memory({ data: data }));
		
		doh.register("RequestMemory tests", [
			function testQuery(t) {
				var dfd = new doh.Deferred(),
					reqmemResults = reqmem.query({}),
					reqmemfastResults = reqmemfast.query({});
				
				all([
					reqmemResults,
					when(reqmemfastResults) // force wait by wrapping in a promise
				]).then(function(results) {
					dfd.getTestCallback(function() {
						var
							reqmemResults = results[0],
							reqmemfastResults = results[1],
							memResults = mem.query({});
						t.t(4 === results[0].length && 4 === results[1].length &&
							4 === memResults.length &&
							reqmemResults[0].name === reqmemfastResults[0].name &&
							reqmemResults[0].name === memResults[0].name &&
							reqmemResults[3].name === reqmemfastResults[3].name &&
							reqmemResults[3].name === memResults[3].name,
							"All stores should eventually yield matching query results");
					})();
				}, function(err) {
					dfd.errback(err);
				});
				
				t.t(reqmemResults.then && reqmemResults.forEach,
					"query on RequestMemory w/ alwaysPromise: true should return a promise wrapped with QueryResults");
				t.t(reqmemfastResults.forEach,
					"query on RequestMemory w/ alwaysPromise: false should return an object wrapped with QueryResults");
				
				return dfd;
			},
			function testGet(t) {
				var dfd = new doh.Deferred();
				
				all([
					reqmem.get(1),
					when(reqmemfast.get(1))
				]).then(function(results) {
					dfd.getTestCallback(function() {
						var
							reqmemItem = results[0],
							reqmemfastItem = results[1],
							memItem = mem.get(1);
						t.t("foo" === reqmemItem.name && "foo" === reqmemfastItem.name &&
							"foo" === memItem.name,
							"All stores should eventually yield the same item for the same get request");
					})();
				}, function(err) {
					dfd.errback(err);
				});
				
				return dfd;
			},
			function testAdd(t) {
				var dfd = new doh.Deferred();
				
				all([
					reqmem.add({ "id": 5, "name": "mushroom" }),
					when(reqmemfast.add({ "id": 5, "name": "mushroom" }))
				]).then(function(results) {
					dfd.getTestCallback(function() {
						var
							reqmemId = results[0],
							reqmemfastId = results[1],
							memId = mem.add({ "id": 5, "name": "mushroom" });
						t.t(5 === reqmemId && 5 === reqmemfastId && 5 === memId,
							"All stores should eventually yield the same id for the same add request");
					})();
				}, function(err) {
					dfd.errback(err);
				});
				
				return dfd;
			},
			function testBehavior(t) {
				var dfd = new doh.Deferred();
				
				all([
					// setUrl returns the request promise
					reqmem.setUrl(url),
					reqmemfast.setUrl(url)
				]).then(dfd.getTestCallback(function() {
					t.t(reqmem.query({}).then,
						"alwaysPromise: true should yield promise on query even after request completes");
					t.f(reqmemfast.query({}).then,
						"alwaysPromise: false should not yield promise on query after request completes");
					t.t(reqmem.get(1).then,
						"alwaysPromise: true should yield promise on get even after request completes");
					t.f(reqmemfast.get(1).then,
						"alwaysPromise: false should not yield promise on get after request completes");
					t.t(reqmem.put({ id: 1, name: "foo" }).then,
						"alwaysPromise: true should yield promise on put even after request completes");
					t.f(reqmemfast.put({ id: 1, name: "foo" }).then,
						"alwaysPromise: false should not yield promise on put after request completes");
				}), function(err) {
					dfd.errback(err);
				});
				
				return dfd;
			},
			function dataAfterUrl(t) {
				var store = new RequestMemory(),
					promise = store.setUrl(url);
				
				store.setData([ { id: 1, name: "Zaphod" }]);
				
				t.is("Zaphod", store.get(1).name,
					"Call to store after direct setData call should be synchronous");
				t.t(promise.isCanceled(),
					"setUrl process should have been interrupted after setData call");
			}
		]);
	});
});