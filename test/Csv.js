define([
	'intern!tdd',
	'intern/chai!assert',
	'dojo/request',
	'dojo/promise/all',
	'dojo-smore/Csv'
], function (test, assert, request, all, Csv) {
	test.suite('Csv', function () {
		var csvs = {}; // holds retrieved raw CSV data
		var stores = window.stores = {}; // holds stores created after CSV data is retrieved

		test.before(function () {
			var xhrBase = require.toUrl('dojo-smore/test/data');

			return all([
				// Load CSV data.  The referenced data has various inconsistencies
				// throughout on purpose, to test that the implementation responds
				// properly to things like extra whitespace, blank values/lines, etc.
				request(xhrBase + '/noquote.csv').then(function (data) {
					csvs.noQuote = data;
					stores.noQuoteNoHeader = new Csv({
						data: data,
						fieldNames: [ 'id', 'last', 'first', 'born', 'died' ]
					});
					stores.noQuoteWithHeader = new Csv({
						data: data
						// No fieldNames; first row will be treated as header row.
					});
					stores.noQuoteTrim = new Csv({
						data: data,
						trim: true
					});
					stores.noQuoteNoHeaderAutoId = new Csv({
						data: data,
						fieldNames: [ 'id', 'last', 'first', 'born', 'died' ],
						trim: true,
						idProperty: '' // Tell store to auto-generate IDs
					});
					stores.noQuoteAutoId = new Csv({
						data: data,
						trim: true,
						idProperty: '' // Tell store to auto-generate IDs
					});
				}),
				request(xhrBase + '/quote.csv').then(function (data) {
					csvs.quote = data;
					stores.quoteNoHeader = new Csv({
						data: data,
						fieldNames: [ 'id', 'name', 'quote' ]
					});
					stores.quoteWithHeader = new Csv({
						data: data
						// No fieldNames; first row will be treated as header row.
					});
				}),
				request(xhrBase + '/contributors.csv').then(function (data) {
					csvs.contributors = data;
					stores.contributors = new Csv({
						data: data
					});
				})
			]);
		});

		test.test('data without quotes', function () {
			var noHeader = stores.noQuoteNoHeader;
			var withHeader = stores.noQuoteWithHeader;
			var trim = stores.noQuoteTrim;

			// Test header vs. no header...
			assert.strictEqual(noHeader.data.length, 4,
				'Store with fieldNames should have 4 items.');
			assert.strictEqual(withHeader.data.length, 3,
				'Store using header row should have 3 items.');
			assert.isDefined(noHeader.get('id'),
				'First line should be considered an item when fieldNames are set');
			assert.isDefined(withHeader.get('1').first,
				'Field names picked up from header row should be trimmed.');
			assert.strictEqual(noHeader.get('1').last, withHeader.get('1').last,
				'Item with id of 1 should have the same data in both stores.');

			// Test trim vs. no trim...
			var item = withHeader.get('2');
			var trimmedItem = trim.get('2');
			assert.strictEqual(item.first, ' Nikola ',
				'Leading/trailing spaces should be preserved if trim is false.');
			assert.strictEqual(trimmedItem.first, 'Nikola',
				'Leading/trailing spaces should be trimmed if trim is true.');
			assert.strictEqual(item.middle, ' ',
				'Strings containing only whitespace should remain intact if trim is false.');
			assert.strictEqual(trimmedItem.middle, '',
				'Strings containing only whitespace should be empty if trim is true.');

			// Test data integrity...
			item = withHeader.get('1');
			assert.strictEqual(item.middle, '', 'Test blank value.');
			assert.strictEqual(item.born, '1879-03-14', 'Test value after blank value.');
			assert.strictEqual(withHeader.get('3').died, '', 'Test blank value at end of line.');
		});

		test.test('data with quotes', function () {
			var noHeader = stores.quoteNoHeader;
			var withHeader = stores.quoteWithHeader;

			// Test header vs. no header...
			assert.strictEqual(noHeader.data.length, 5,
				'Store with fieldNames should have 5 items.');
			assert.strictEqual(withHeader.data.length, 4,
				'Store using header row should have 4 items.');
			assert.isDefined(noHeader.get('id'),
				'First line should be considered an item when fieldNames are set');
			assert.strictEqual(noHeader.get('1').name, withHeader.get('1').name,
				'Item with id of 1 should have the same data in both stores.');

			// Test data integrity...
			assert.strictEqual(withHeader.get('3').quote, '""',
				'Value consisting of two double-quotes should pick up properly.');
			assert.strictEqual(withHeader.get('4').quote, ' S, P, ...ace! ',
				'Leading/trailing spaces within quotes should be preserved.');
			assert.isTrue(/^Then[\s\S]*"Nevermore\."$/.test(withHeader.get('2').quote),
				'Multiline value should remain intact.');
			assert.isTrue(/smiling,\r\n/.test(withHeader.get('2').quote),
				'Multiline value should use same newline format as input.');
		});

		test.test('auto-incrementing IDs', function () {
			var noQuoteAutoId = stores.noQuoteAutoId;
			var noQuoteNoHeaderAutoId = stores.noQuoteNoHeaderAutoId;

			assert.strictEqual(noQuoteNoHeaderAutoId.get('1').last, 'last',
				'Item 1 should be the first line');
			assert.strictEqual(noQuoteNoHeaderAutoId.get('2').last, 'Hawking',
				'Item 2 should be the second line');
			assert.strictEqual(noQuoteNoHeaderAutoId.get('3').last, 'Einstein',
				'Item 3 should be the third line');
			assert.strictEqual(noQuoteNoHeaderAutoId.get('4').last, 'Tesla',
				'Item 4 should be the fourth line');

			assert.strictEqual(noQuoteAutoId.get('1').last, 'Hawking',
				'Item 1 should be the first non-header line');
			assert.strictEqual(noQuoteAutoId.get('2').last, 'Einstein',
				'Item 2 should be the second non-header line');
			assert.strictEqual(noQuoteAutoId.get('3').last, 'Tesla',
				'Item 3 should be the third non-header line');
		});

		test.test('import/export', function () {
			assert.strictEqual(stores.contributors.toCsv(), csvs.contributors,
				'toCsv() should generate data matching original if it is well-formed');
		});
	});
});
