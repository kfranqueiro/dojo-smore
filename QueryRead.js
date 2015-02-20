define([
	'dojo/_base/lang', // for mixin and delegate
	'dojo/_base/declare',
	'dojo/request',
	'dojo/store/util/QueryResults'
], function (lang, declare, request, QueryResults) {
	return declare(null, {
		// summary:
		//		Implementation of dojo/store's read APIs (get, getIdentity, query)
		//		which performs server requests for each query.  Intended as a
		//		spiritual successor to dojox/data/QueryReadStore.
		// description:
		//		While this store can be thought of as a spiritual successor to
		//		dojox/data/QueryReadStore, it is by no means identical.  Some key
		//		differences include:
		//		* Does not support client-side paging/sorting, because those don't
		//			make a lot of sense when querying from the server each time.
		//			If client paging/sorting is desired, consider using RequestMemory.
		//		* Supports customization of relevant request parameters and
		//			response properties (QueryReadStore hard-coded these).
		//			Note that the total result count defaults to inspecting "total",
		//			not "numRows".
		//		* Supports both object and array responses; inspects Content-Range
		//			header for total result count if response is an array.
		//		* Query and response transformation are both completely pluggable.
		//		* This implementation does NOT cache/index the last query result
		//			(which QueryReadStore does to speed up `get` requests as well as
		//			certain subsequent `query` calls).  This results in simpler code and
		//			more consistent API (get always returns a promise).
		//			QueryReadStore-like `get` caching could easily be achieved using
		//			dojo/store/Cache.

		// url: String
		//		URL to send requests to.
		url: '',

		// idProperty: String
		//		Name of property containing the unique identifier of each item.
		idProperty: 'id',

		// totalProperty: String
		//		If the server responds to queries with an object, this specifies the
		//		property denoting the total number of results for the query.
		totalProperty: 'total',

		// itemsProperty: String
		//		If the server responds to queries with an object, this specifies the
		//		property containing the array of requested items.
		itemsProperty: 'items',

		// startParam: String
		//		Name of request parameter used to inform server of start of range.
		startParam: 'start',

		// countParam: String
		//		Name of request parameter used to inform server of length of range.
		countParam: 'count',

		// sortParam: String
		//		Name of request parameter used to inform server of sort preference.
		sortParam: 'sort',

		processSort: function (sort) {
			// summary:
			//		Given the value of the sort property from a queryOptions object,
			//		returns a string to be passed in the server query, as the value of
			//		the parameter whose name is specified by sortParam.
			// description:
			//		The default implementation of processSort returns a comma-delimited
			//		value containing fields to sort by, with highest precedence first.
			//		Descending sort is indicated by a hyphen before the field name.
			//		(This is the same format used by dojox/data/QueryReadStore.)
			// sort: Array
			//		The sort property from a queryOptions object - an array of objects
			//		with attribute and (optionally) descending properties.
			// returns:
			//		String to be used as value of request parameter for sorting.
			// tags:
			//		extension

			var value = '';

			for (var i = 0, len = sort.length; i < len; i++) {
				value += (sort[i].descending ? '-' : '') + sort[i].attribute + ',';
			}

			// Exclude trailing comma when returning.
			return value.slice(0, -1); // String
		},

		processQuery: function (query, queryOptions) {
			// summary:
			//		Method responsible for any necessary processing of incoming
			//		store query arguments.  May be overridden for special needs.
			// returns:
			//		Object containing arguments to be passed to dojo/request
			//		(typically just a query property).
			// tags:
			//		extension

			var q = lang.mixin({}, query);

			if (queryOptions) {
				if (typeof queryOptions.start !== 'undefined') {
					q[this.startParam] = queryOptions.start;
				}
				if (typeof queryOptions.count !== 'undefined') {
					q[this.countParam] = queryOptions.count;
				}
				if (queryOptions.sort) {
					q[this.sortParam] = this.processSort(queryOptions.sort);
				}
			}

			return { // Object
				query: q
			};
		},

		processRequest: function (promise) {
			// summary:
			//		Method responsible for handling data resolved from the server
			//		request.  May be overridden for special needs.
			// returns:
			//		Object prepared to be wrapped by QueryResults (i.e. a
			//		delegated promise decorated with an additional `total` promise).
			// tags:
			//		extension

			var self = this;

			var resultsPromise = promise.then(function (data) {
				if (typeof data.length !== 'undefined') {
					// Received an array directly; return it.
					return data;
				}
				// Otherwise, retrieve items from the appropriate property.
				return data[self.itemsProperty];
			});

			// Need to delegate to build results object, since promises are frozen.
			var results = lang.delegate(resultsPromise, {
				total: promise.response.then(function (response) {
					if (typeof response.data.length !== 'undefined') {
						// Received an array directly; check for Content-Range header to
						// denote total count.  Failing that, fall back to length of array.
						var range = response.getHeader('Content-Range');
						var index = range ? range.lastIndexOf('/') : -1;
						return index > -1 ? +range.slice(index + 1) : response.data.length;
					}
					// Otherwise, retrieve total from the appropriate property.
					return response.data[self.totalProperty];
				})
			});

			return results; // Promise
		},

		constructor: function (options) {
			lang.mixin(this, options);
		},

		getIdentity: function (obj) {
			// summary:
			//		Returns an object's identity.
			// object: Object
			//		The object to get the identity from.

			return obj[this.idProperty]; // mixed
		},

		get: function (id) {
			// summary:
			//		Retrieves an object by its identity.
			// id: mixed
			//		The identity to match an object against.

			var q = {};
			q[this.idProperty] = id;

			// Perform a query for a single item with the specified identity.
			return this.query(q, { start: 0, count: 1 }).then(function (results) { // Promise
				return results[0] || null;
			});
		},

		query: function (query, queryOptions) {
			// summary:
			//		Queries the store for objects.
			// query: Object
			//		The query to use for retrieving relevant objects from the store.
			// options: dojo/store/api/Store.QueryOptions?
			//		Additional options for the query, i.e. start, count, and sort.

			return new QueryResults( // dojo/store/util/QueryResults
				this.processRequest(request(this.url,
					lang.mixin({ handleAs: 'json' }, this.processQuery(query, queryOptions))
			)));
		}
	});
});
