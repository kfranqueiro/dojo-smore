define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/when",
	"dojo/request",
	"dojo/store/Memory",
	"dojo/store/util/QueryResults"
], function(declare, lang, arrayUtil, when, request, Memory, QueryResults) {
	var Request = declare(Memory, {
		// summary:
		//		Implementation of an in-memory store primed by data from an
		//		async request.
		
		// url: String
		//		URL to request data from.
		url: "",
		
		// requestOptions: Object?
		//		Any options to pass to the request call, e.g. method, query, data...
		requestOptions: null,
		
		// alwaysPromise: Boolean
		//		If true (the default), get, add, put, remove, and query will always
		//		return promises as long as a URL has been set (not data).  If false,
		//		any calls made after the response has been received will execute
		//		synchronously without routing through the promise from the request,
		//		which can yield better performance.
		alwaysPromise: true,
		
		constructor: function() {
			var originalMethods = {};
			
			if (this.url) {
				this.setUrl(this.url);
			}
			
			// Wrap most of the instance methods here, in a loop, since they can all
			// be wrapped the same.  The query method is extended separately.
			arrayUtil.forEach(["get", "add", "put", "remove"], function(method) {
				originalMethods[method] = this[method];
				this[method] = function() {
					var args = arguments,
						self = this;
					return when(this._promise, function() {
						return originalMethods[method].apply(self, args);
					});
				};
			}, this);
		},
		
		query: function(query, options) {
			var self = this,
				ret = new QueryResults(when(this._promise, function() {
					// This is slightly repetitive of dojo/store/Memory; we can't simply
					// call inherited (would end up wrapping early with QueryResults).
					return self.queryEngine(query, options)(self.data);
				}));
			
			ret.total = when(ret, function(results) {
				// When the queryEngine call itself comes back, it will not have
				// a total property unless it puts one there itself from processing
				// a paging request.  Fall back to length if it's missing (unpaged).
				return "total" in results ? results.total : results.length;
			});
			return ret;
		},
		
		setUrl: function(url) {
			// summary:
			//		Sets the given URL as the source for this store, and indexes it
			// url: String
			//		Specifies the URL to retrieve data from.
			
			var self = this,
				promise = this._promise,
				options = lang.mixin({ handleAs: "json" }, this.requestOptions);
			
			if (promise && !promise.isFulfilled()) {
				// Cancel in-flight request since a new URL has been provided.
				promise.cancel();
			}
			
			// Store promise before chained handler to avoid confusion when
			// setData checks fulfillment.
			promise = this._promise = request(url, options);
			
			promise.then(function(response) {
				self.setData(response, self.alwaysPromise);
			});
			
			return promise;
		},
		
		setData: function(data, _keepPromise) {
			// summary:
			//		Sets the given data as the source for this store, and indexes it.
			// data: Array
			//		An array of objects to use as the source of data.
			// _keepPromise: Boolean?
			//		Used internally by setUrl.  There's no reason to specify this manually.
			
			var promise = this._promise;
			if (promise && !promise.isFulfilled()) {
				// Cancel in-flight request since new data has been provided.
				promise.cancel();
			}
			if (!_keepPromise) {
				// Delete _promise (when setData is called directly, or
				// alwaysPromise is false).
				delete this._promise;
			}
			
			this.inherited(arguments);
		}
	});
	
	return Request;
});